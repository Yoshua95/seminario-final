import {test,before,after} from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFile,readdir} from "node:fs/promises";
import {PGlite} from "@electric-sql/pglite";
import {createLocalDatabase,asUser,demoUsers as users} from "../scripts/local-database.mjs";
import {quoteFixture} from "./quote-fixture.mjs";
let db;
const q=(actor,sql,params=[])=>asUser(db,users[actor],sql,params);
const commercial=(actor,payload)=>q(actor,"select public.save_commercial_profile($1::jsonb) id",[JSON.stringify(payload)]);
const profile=(name="Nombre comercial")=>({trade_name:name,description:"Servicios declarados",city:"Córdoba",province:"Córdoba",country:"Argentina",modes:["air"],specialties:["Electrónica"],coverage:["China"],categories:["Tecnología"],published:true});
const directory=(actor="importer",filters=["","","","",null])=>q(actor,"select public.commercial_directory($1,$2,$3,$4,$5) p",filters);
const quote=(actor,command,payload)=>q(actor,"select public.quote_command($1,$2::jsonb) r",[command,JSON.stringify(payload)]);
const award=id=>q("importer","select public.award_offer($1) id",[id]);
async function cargo(){const id=randomUUID();await db.query("insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,$2,'Cargo','Test','A','B','Test',1,1,90000,'open',now()+interval '1 day')",[id,users.importer]);return id;}
before(async()=>{db=await createLocalDatabase();for(const [actor,name] of [["operator","Comercial Andina"],["competitor","Operador Nuevo"],["pending","Perfil Pendiente"],["suspended","Perfil Suspendido"]])await commercial(actor,profile(name));});
after(async()=>{await db?.close();});

test("directorio muestra aprobados; excluye pendientes y suspendidos aun por identificador",async()=>{
 const rows=(await directory()).rows.map(r=>r.p);
 assert.deepEqual(rows.map(r=>r.trade_name).sort(),["Comercial Andina","Operador Nuevo"]);
 const pending=(await q("pending","select public_id from public.operator_commercial_profiles")).rows[0].public_id;
 assert.equal((await directory("importer",["","","","",pending])).rows.length,0);
});
test("búsqueda y filtros comerciales se combinan",async()=>{
 assert.equal((await directory("importer",["Andina","air","Electrónica","China",null])).rows.length,1);
 for(const filters of [["No existe","","","",null],["","sea","","",null],["","","Alimentos","",null],["","","","Europa",null]]) assert.equal((await directory("importer",filters)).rows.length,0);
});
test("operador nuevo tiene completed=0, count=0 y average=null",async()=>{
 const p=(await directory("importer",["Operador Nuevo","","","",null])).rows[0].p;
 assert.deepEqual(p.reputation,{role:"operator",completed:0,count:0,average:null,history:"sin historial"});
});
test("directorio y queries alternativas no exponen identidad legal ni contactos",async()=>{
 await db.query("update public.profiles set phone='+54 11 7777-8888' where id=$1",[users.operator]);
 const raw=JSON.stringify((await directory()).rows);
 for(const secret of ["tax_id","phone","email","address","verified_by","rejection_reason","documents","30-71234567-8","7777-8888","operator_id"]) assert.equal(raw.includes(secret),false,secret);
 assert.equal((await q("importer","select * from public.operator_profiles where user_id=$1",[users.operator])).rows.length,0);
 assert.equal((await q("importer","select * from public.profiles where id=$1",[users.operator])).rows.length,0);
 assert.equal((await q("competitor","select * from public.operator_commercial_profiles where operator_id=$1",[users.operator])).rows.length,0);
 const snap=(await q("competitor","select public.operator_snapshot() s")).rows[0].s;
 assert.equal(JSON.stringify(snap).includes("30-71234567-8"),false);
 assert.equal((await q("competitor","select public.operation_contacts($1) c",["d0000000-0000-0000-0000-000000006291"])).rows[0].c,null);
 assert.equal((await q("importer","select public.operation_contacts($1) c",["d0000000-0000-0000-0000-000000006291"])).rows[0].c.phone,"+54 11 7777-8888");
});
test("operador edita solo campos propios; no verificación, reputación, dueño o moderación",async()=>{
 for(const field of ["operator_id","verification_status","rating","completed_operations","admin_hidden"])await assert.rejects(commercial("operator",{...profile("Comercial Andina"),[field]:users.competitor}),/no editable/);
 await assert.rejects(q("operator","update public.operator_commercial_profiles set trade_name='Otro'"),/permission denied/);
 await assert.rejects(commercial("operator",{...profile(),description:"Contacto correo@empresa.com"}),/contactos/);
 await assert.rejects(commercial("operator",{...profile(),description:"Teléfono +54 11 5555-1234"}),/contactos/);
 await assert.rejects(commercial("importer",profile()),/operador/);
});
test("moderación administrativa persiste y no puede ser revertida por operador",async()=>{
 const id=(await q("operator","select public_id from public.operator_commercial_profiles")).rows[0].public_id;
 await assert.rejects(q("operator","select public.moderate_commercial_profile($1,$2::jsonb)",[id,JSON.stringify({admin_hidden:true})]),/administrativo/);
 await q("admin","select public.moderate_commercial_profile($1,$2::jsonb)",[id,JSON.stringify({admin_hidden:true,description:"Contenido moderado"})]);
 assert.equal((await directory("importer",["Andina","","","",null])).rows.length,0);
 await commercial("operator",profile("Comercial Andina"));
 assert.equal((await directory("importer",["Andina","","","",null])).rows.length,0);
 await q("admin","select public.moderate_commercial_profile($1,$2::jsonb)",[id,JSON.stringify({admin_hidden:false})]);
 assert.ok((await q("admin","select * from public.audit_logs where action like 'commercial.%'")).rows.length>0);
});
test("suspendido desaparece del directorio pero participante conserva perfil histórico seguro",async()=>{
 const id=(await q("operator","select public_id from public.operator_commercial_profiles")).rows[0].public_id;
 await db.query("update public.operator_profiles set verification_status='suspended' where user_id=$1",[users.operator]);
 assert.equal((await directory("importer",["Andina","","","",null])).rows.length,0);
 const historical=(await directory("importer",["","","","",id])).rows[0].p;
 assert.equal(historical.available,false);assert.equal(historical.verification_status,"suspended");assert.equal(historical.trade_name,"Comercial Andina");
 assert.equal((await directory("competitor",["","","","",id])).rows.length,0);
 await db.query("update public.operator_profiles set verification_status='approved' where user_id=$1",[users.operator]);
});
test("borrador editable auditado y privado; presentación exige todos los términos",async()=>{
 const c=await cargo();const id=(await quote("operator","save",{cargo_id:c,quote:{scope:"Borrador inicial"}})).rows[0].r.id;
 await quote("operator","save",{draft_id:id,quote:{scope:"Revisión del borrador"}});
 assert.equal((await q("operator","select content from public.quote_drafts where id=$1",[id])).rows[0].content.scope,"Revisión del borrador");
 assert.equal((await q("competitor","select * from public.quote_drafts where id=$1",[id])).rows.length,0);
 await assert.rejects(quote("operator","submit",{draft_id:id}),/términos/);
 await assert.rejects(quote("operator","save",{draft_id:id,quote:{included:{private:"object"}}}),/Lista/);
 const f=(await quote("operator","submit",{draft_id:id,quote:quoteFixture()})).rows[0].r.id;
 assert.equal((await quote("operator","submit",{draft_id:id})).rows[0].r.id,f);
 await assert.rejects(quote("operator","save",{draft_id:id,quote:quoteFixture()}),/presentado/);
 assert.ok((await q("admin","select * from public.audit_logs where entity_id=$1",[id])).rows.length>=3);
});
test("USD y ARS separados; rechaza combinación, precio contradictorio e incluidos/excluidos repetidos",async()=>{
 for(const changes of [{currency:"USD/ARS"},{included:["Seguro"],excluded:["Seguro"]},{insurance:""},{required_documents:[]},{services:["unknown"]}])await assert.rejects(quote("operator","submit",{cargo_id:await cargo(),quote:quoteFixture(changes)}));
 const ars=(await quote("operator","submit",{cargo_id:await cargo(),quote:quoteFixture({currency:"ARS"})})).rows[0].r.id;
 const row=(await q("operator","select * from public.offers where id=$1",[ars])).rows[0];assert.equal(row.payment_currency,"ARS");assert.equal(row.normalized_quote.currency,"ARS");
 await assert.rejects(q("operator","update public.offers set payment_currency='USD' where id=$1",[ars]),/permission denied/);
});
test("retiro y reemplazo crean revisión nueva sin alterar la propuesta original",async()=>{
 const c=await cargo();const first=(await quote("operator","submit",{cargo_id:c,quote:quoteFixture()})).rows[0].r.id;
 await quote("operator","withdraw",{offer_id:first});
 const second=(await quote("operator","submit",{cargo_id:c,replaces_offer_id:first,quote:quoteFixture({amount:"1100",excluded:["Seguro"]})})).rows[0].r.id;
 const rows=(await q("operator","select * from public.offers where cargo_id=$1 order by revision",[c])).rows;
 assert.equal(rows[0].status,"withdrawn");assert.equal(rows[0].normalized_quote.amount,"1000");assert.equal(rows[1].normalized_quote.amount,"1100");assert.equal(rows[1].revision,2);assert.equal(rows[1].replaces_offer_id,first);assert.equal(rows[0].quote_group_id,rows[1].quote_group_id);
 await assert.rejects(quote("operator","submit",{cargo_id:c,replaces_offer_id:first,quote:quoteFixture()}),/reemplazarse/);
 assert.equal((await q("competitor","select * from public.offers where id=$1",[second])).rows.length,0);
 assert.equal((await q("competitor","select public.offer_public_profile($1) p",[second])).rows[0].p,null);
});
test("cierre, vencimiento y aceptación impiden modificaciones; snapshot contractual inmutable",async()=>{
 const c=await cargo();const first=(await quote("operator","submit",{cargo_id:c,quote:quoteFixture()})).rows[0].r.id;
 const op=(await award(first)).rows[0].id;assert.equal((await award(first)).rows[0].id,op);
 const snapshot=(await q("importer","select * from public.operation_contract_snapshots where operation_id=$1",[op])).rows[0];
 assert.equal(snapshot.state,"complete");assert.equal(snapshot.content.quote.amount,"1000");assert.equal(snapshot.content.revision,1);
 await assert.rejects(quote("operator","withdraw",{offer_id:first}),/cerrada/);
 await assert.rejects(quote("operator","submit",{cargo_id:c,replaces_offer_id:first,quote:quoteFixture()}),/cerrada/);
 await assert.rejects(db.query("update public.operation_contract_snapshots set content='{}' where operation_id=$1",[op]),/inmutable/);
 await assert.rejects(db.query("update public.offers set normalized_quote=jsonb_set(normalized_quote,'{amount}','\"99\"') where id=$1",[first]),/sellada/);
 assert.equal((await q("competitor","select * from public.operation_contract_snapshots where operation_id=$1",[op])).rows.length,0);
 const closed=await cargo();const f=(await quote("operator","submit",{cargo_id:closed,quote:quoteFixture()})).rows[0].r.id;
 await db.query("update public.cargo_requests set bidding_deadline=now()-interval '1 second' where id=$1",[closed]);
 await assert.rejects(quote("operator","withdraw",{offer_id:f}),/cerrada/);
 await assert.rejects(award(f),/adjudicable/);
 await assert.rejects(quote("operator","submit",{cargo_id:await cargo(),quote:quoteFixture({valid_until:"2000-01-01T00:00:00Z"})}),/Vigencia/);
 const expiring=await cargo();const expired=(await quote("operator","submit",{cargo_id:expiring,quote:quoteFixture()})).rows[0].r.id;
 await db.exec("alter table public.offers disable trigger guard_sealed_offer");
 try {await db.query("update public.offers set valid_until=now()-interval '1 second' where id=$1",[expired]);}
 finally {await db.exec("alter table public.offers enable trigger guard_sealed_offer");}
 await assert.rejects(quote("operator","withdraw",{offer_id:expired}),/vencida/);
 await assert.rejects(quote("operator","submit",{cargo_id:expiring,replaces_offer_id:expired,quote:quoteFixture()}),/reemplazarse/);
 await assert.rejects(award(expired),/vencida/);
});
test("taxonomía SQL coincide con dominio y el upgrade no inventa condiciones históricas",async()=>{
 const taxonomy=JSON.parse(await readFile(new URL("../packages/domain/src/services.json",import.meta.url),"utf8"));assert.deepEqual((await db.query("select public.quote_taxonomy() t")).rows[0].t,Object.keys(taxonomy));
 const old=new PGlite();await old.waitReady;try{
 await old.exec(await readFile(new URL("../supabase/demo/bootstrap.sql",import.meta.url),"utf8"));
 const files=(await readdir(new URL("../supabase/migrations/",import.meta.url))).filter(f=>f.endsWith('.sql')).sort();
 for(const f of files.filter(f=>f<'0017'))await old.exec((await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8')).replace(/create extension if not exists "pgcrypto";/i,''));
 await old.exec(await readFile(new URL('../supabase/demo/operator-seed.sql',import.meta.url),'utf8'));
 for(const f of files.filter(f=>f>='0017'))await old.exec(await readFile(new URL('../supabase/migrations/'+f,import.meta.url),'utf8'));
 assert.equal((await old.query('select count(*)::int n from public.operator_commercial_profiles')).rows[0].n,0);
 assert.equal((await old.query("select count(*)::int n from public.operation_contract_snapshots where state='requires_review' and content is null")).rows[0].n,3);
 assert.equal((await old.query('select count(*)::int n from public.offers where normalized_quote is not null')).rows[0].n,0);
 }finally{await old.close();}
});
