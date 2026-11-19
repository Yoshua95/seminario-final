import{test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{randomUUID}from'node:crypto';
import{createLocalDatabase,asUser,demoUsers as u}from'../scripts/local-database.mjs';import{quoteFixture}from'./quote-fixture.mjs';
let db,cargo,operator,offer,proposal,baseline;
const q=(actor,sql,args=[])=>asUser(db,u[actor]??actor,sql,args);
before(async()=>{
 db=await createLocalDatabase();baseline=(await db.query('select * from operation_capacity_reservations order by operation_id')).rows;
 await db.exec("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;");
 await db.exec(await readFile(new URL('../supabase/migrations/20261119024020_ars_only_new_contracts.sql',import.meta.url),'utf8'));
 if(!(await db.query("select to_regclass('public.cargo_volume_proposals') name")).rows[0].name)await db.exec(await readFile(new URL('../supabase/migrations/20261119060412_unknown_cargo_volume_confirmation.sql',import.meta.url),'utf8'));
 operator=randomUUID();await db.query('insert into auth.users(id,email) values($1,$2)',[operator,'volume-operator@test.invalid']);await db.query("update profiles set role='operator' where id=$1",[operator]);await db.query("insert into operator_profiles(user_id,company_name,tax_id,verification_status) values($1,'Volume fixture','DEMO','approved')",[operator]);
 await q('admin','select configure_operator_capacity($1,$2::jsonb)',[operator,JSON.stringify({currency:'ARS',max_operations:'3',max_per_operation:'300000',max_exposure:'900000',declared_working_capital:'300000',approved_working_capital:'300000',status:'active',valid_from:'2020-01-01T00:00:00Z',reason:'Prueba local ficticia de volumen'})]);
});
after(async()=>db?.close());
const payload=()=>({title:'Otro volumen desconocido',description:'Articulos de ensayo para exhibicion',origin:'Shenzhen',destination:'Buenos Aires',category:'Otro',weight_kg:10,volume_m3:null,volume_unknown:true,fob_usd:1100,preferred_mode:'sea'});
test('publica Otro con FOB USD y NULL real; reintento no duplica',async()=>{
 const id=randomUUID(),p=JSON.stringify(payload());const a=(await q('importer','select prepare_cargo_publication($1,$2::jsonb) id',[id,p])).rows[0].id;const b=(await q('importer','select prepare_cargo_publication($1,$2::jsonb) id',[id,p])).rows[0].id;assert.equal(a,b);cargo=a;
 await q('importer','select publish_cargo($1)',[cargo]);const row=(await db.query('select volume_m3,fob_usd,status,category from cargo_requests where id=$1',[cargo])).rows[0];assert.equal(row.volume_m3,null);assert.equal(Number(row.fob_usd),1100);assert.equal(row.status,'open');assert.equal(row.category,'Otro');
});
test('no convierte omisiones o cero en volumen desconocido',async()=>{
 for(const volume of[0,-1,null,'NaN','Infinity']){const p={...payload(),volume_unknown:false,volume_m3:volume};await assert.rejects(q('importer','select prepare_cargo_publication($1,$2::jsonb)',[randomUUID(),JSON.stringify(p)]));}
 await assert.rejects(q('importer','select prepare_cargo_publication($1,$2::jsonb)',[randomUUID(),JSON.stringify({...payload(),volume_m3:1})]),/null/);
});
test('no reserva Capacity ni crea operación antes de confirmar volumen',async()=>{
 offer=(await q(operator,"select quote_command('submit',$1::jsonb) r",[JSON.stringify({cargo_id:cargo,quote:quoteFixture({currency:'ARS',amount:'25000',working_capital_amount:'1000'})})])).rows[0].r.id;
 await assert.rejects(q('importer','select award_offer($1)',[offer]),/volumen.*Capacity/);
 assert.equal((await db.query('select count(*)::int n from operations where cargo_id=$1',[cargo])).rows[0].n,0);
});
test('solo operador aprobado propone; mismo valor mantiene ID y no reserva',async()=>{
 await assert.rejects(q('importer','select propose_cargo_volume($1,.5)',[cargo]),/Operador/);
 await assert.rejects(q('pending','select propose_cargo_volume($1,.5)',[cargo]),/Operador/);
 for(const v of[0,-1,'NaN','Infinity'])await assert.rejects(q(operator,'select propose_cargo_volume($1,$2)',[cargo,v]));
 proposal=(await q(operator,'select propose_cargo_volume($1,.5) id',[cargo])).rows[0].id;
 assert.equal((await q(operator,'select propose_cargo_volume($1,.5) id',[cargo])).rows[0].id,proposal);
 assert.equal((await db.query('select volume_m3 from cargo_requests where id=$1',[cargo])).rows[0].volume_m3,null);
 assert.equal((await db.query('select count(*)::int n from operation_capacity_reservations where operator_id=$1',[operator])).rows[0].n,0);
});
test('rechaza acceso horizontal, confirmación del operador y monto obsoleto',async()=>{
 await assert.rejects(q('competitor','select confirm_cargo_volume($1,.5)',[proposal]),/autorizada/);
 await assert.rejects(q(operator,'select confirm_cargo_volume($1,.5)',[proposal]),/autorizada/);
 await assert.rejects(q('importer','select confirm_cargo_volume($1,.6)',[proposal]),/cambio/);
 const hidden=await q('competitor','select id from cargo_volume_proposals where id=$1',[proposal]);assert.equal(hidden.rows.length,0);
 await assert.rejects(q(operator,'update cargo_volume_proposals set volume_m3=99 where id=$1',[proposal]),/permission denied/);
});
test('confirmación del dueño persiste, es idempotente y reserva el volumen correcto',async()=>{
 for(let i=0;i<2;i++)assert.equal((await q('importer','select confirm_cargo_volume($1,.5) id',[proposal])).rows[0].id,cargo);
 const row=(await db.query('select volume_m3,volume_confirmed_by,volume_confirmed_at from cargo_requests where id=$1',[cargo])).rows[0];assert.equal(Number(row.volume_m3),.5);assert.equal(row.volume_confirmed_by,u.importer);assert.ok(row.volume_confirmed_at);
 const op=(await q('importer','select award_offer($1) id',[offer])).rows[0].id;assert.equal((await q('importer','select award_offer($1) id',[offer])).rows[0].id,op);
 const r=(await db.query('select volume_m3,currency from operation_capacity_reservations where operation_id=$1',[op])).rows[0];assert.equal(Number(r.volume_m3),.5);assert.equal(r.currency,'ARS');
 await assert.rejects(q(operator,'select propose_cargo_volume($1,.8)',[cargo]),/no admite/);
 const old=(await db.query('select * from operation_capacity_reservations where operation_id<>$1 order by operation_id',[op])).rows;assert.deepEqual(old,baseline);
});
