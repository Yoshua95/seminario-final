import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {createLocalDatabase,asUser,demoUsers as users} from '../scripts/local-database.mjs';
import {quoteFixture} from './quote-fixture.mjs';
import {gatewayDocument} from './document-gateway-helper.mjs';
import {reconcileRegisteredPayment} from '../supabase/functions/_shared/mercado-pago-registered.mjs';
import {fakeRegisteredProvider} from './mvp-payment-fixture.mjs';
let db;
const q=(actor,sql,args=[])=>asUser(db,users[actor]??actor,sql,args);
before(async()=>{
 db=await createLocalDatabase();
 for(const name of ['20261118203109_mp_test_argentina_sandbox_url.sql','20261119051337_mp_linked_test_payment_evidence.sql','20261119140102_mp_registered_test_preference_evidence.sql'])await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 for(const name of ['20261119024020_ars_only_new_contracts.sql','20261119180708_offer_capital_reservations.sql','20261119181203_capital_requests_admin_workbench.sql','20261119221524_capital_profile_consistency.sql','20261119225500_accept_offer_test_checkout.sql','20261120135235_support_message_participant_guard.sql','20261120135605_mvp_nonfinancial_marketplace.sql','20261120142007_mvp_test_delivery_protection.sql']){
  await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 }
 await db.exec('alter table auth.users add column if not exists email_confirmed_at timestamptz default now()');
 await db.exec(await readFile(new URL('../supabase/migrations/20261120143457_mvp_registered_provider_binding.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261120165753_candidate_revoke_anonymous_definer_execution.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261120172155_compatible_route_country_suffix.sql',import.meta.url),'utf8'));
});
after(()=>db?.close());
test('compatibilidad reconoce ciudad y país declarados sin coincidencias parciales',async()=>{
 const row=(await db.query("select public.route_region('Shanghai, China') origin,public.route_region('Buenos Aires, Argentina') destination,public.route_region('Chinatown') deceptive")).rows[0];
 assert.deepEqual(row,{origin:'CN',destination:'AR',deceptive:'chinatown'});

});
test('anon no ejecuta APIs definer; authenticated y servicio conservan sus permisos legítimos',async()=>{
 const result=(await db.query("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')")).rows[0];
 assert.equal(result.n,0);
 assert.equal((await db.query("select has_function_privilege('authenticated','public.quote_command(text,jsonb)','execute') ok")).rows[0].ok,true);
 assert.equal((await db.query("select has_function_privilege('service_role','public.record_mp_test_payment(uuid,uuid,jsonb)','execute') ok")).rows[0].ok,true);
 await db.exec('set role anon');
 try{await assert.rejects(db.query('select public.document_upload_target($1,$2::jsonb)',[users.importer,'{}']),/permission denied/);}finally{await db.exec('reset role');}
 assert.equal((await db.query("select has_function_privilege('authenticated','public.award_offer_before_msds(uuid)','execute') ok")).rows[0].ok,false);
});
async function cargo(){const id=randomUUID();await db.query("insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline,preferred_mode)values($1,$2,'Carga MVP','Carga ficticia de prueba','Shanghai, China','Buenos Aires, Argentina','Otro',10,1,1100,'open',now()+interval '2 days','air')",[id,users.importer]);return id;}
async function authorize(actor='operator'){
 const id=users[actor]??actor;
 await db.query("update public.operator_profiles set verification_status='pending' where user_id=$1",[id]);
 const payload={company_name:'Empresa de ensayo '+actor,tax_id:actor==='operator'?'30712345671':'20123456786',origin:'China',destination:'Argentina',services:['international_transport'],modes:['air'],document_ids:[],description:'Empresa ficticia del MVP'};
 await q(id,'select public.submit_company_application($1,$2::jsonb)',[randomUUID(),JSON.stringify(payload)]);
 const key=randomUUID();
 const args=[id,'approved','Revisión ficticia de empresa y alcance',JSON.stringify({identity:true,company:true,documents:true}),key];
 const first=(await q('admin','select public.admin_review_company($1,$2,$3,$4::jsonb,$5) id',args)).rows[0].id;
 const second=(await q('admin','select public.admin_review_company($1,$2,$3,$4::jsonb,$5) id',args)).rows[0].id;
 assert.equal(first,second);return id;
}
function terms(changes={}){const f=quoteFixture({currency:'ARS',amount:'250000',...changes});delete f.working_capital_amount;delete f.working_capital_currency;return f;}
async function submit(id,changes={},actor='operator'){return (await q(actor,"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify({cargo_id:id,submission_key:randomUUID(),quote:terms(changes)})])).rows[0].r.id;}
test('CUIT exige checksum y la habilitación tiene una sola decisión y alcance',async()=>{
 assert.equal((await db.query("select public.valid_cuit('30-71234567-1') ok")).rows[0].ok,true);
 assert.equal((await db.query("select public.valid_cuit('30-71234567-9') ok")).rows[0].ok,false);
 await authorize();
 assert.equal((await db.query('select count(*)::int n from public.operator_authorizations where operator_id=$1',[users.operator])).rows[0].n,1);
});
test('oferta ARS sin capital se publica sin cupo ni reserva monetaria',async()=>{
 const c=await cargo(),before=(await db.query('select count(*)::int n from public.operation_capacity_reservations')).rows[0].n;
 const f=await submit(c);const op=(await q('importer','select public.award_offer($1) id',[f])).rows[0].id;
 const again=(await q('importer','select public.award_offer($1) id',[f])).rows[0].id;
 assert.equal(op,again);
 assert.equal((await db.query('select count(*)::int n from public.offer_capital_reservations where offer_id=$1',[f])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from public.operation_capacity_reservations')).rows[0].n,before);
 const snapshot=(await db.query('select content from public.operation_contract_snapshots where operation_id=$1',[op])).rows[0].content;
 assert.equal(snapshot.quote.amount,'250000');assert.equal(snapshot.quote.currency,'ARS');assert.equal(snapshot.quote.working_capital_amount,undefined);
 assert.equal((await db.query('select fob_usd from public.cargo_requests where id=$1',[c])).rows[0].fob_usd,'1100.00');
});
test('rechaza USD, ruta incompatible y permiso directo para insertar ofertas',async()=>{
 const c=await cargo();await assert.rejects(submit(c,{currency:'USD'}),/ARS/);
 await db.query("update public.cargo_requests set destination='Brasil' where id=$1",[c]);
 await assert.rejects(submit(c),/habilitada/);
 assert.equal((await q('operator','select count(*)::int n from public.cargo_requests where id=$1',[c])).rows[0].n,0);
 await assert.rejects(q('operator',"insert into public.offers(cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until)values($1,$2,'air',10,5,'prueba',now()+interval '1 day')",[c,users.operator]),/permission denied/);
});
test('retirar es idempotente y una oferta retirada o vencida no se adjudica',async()=>{
 const c=await cargo(),f=await submit(c);
 for(let n=0;n<2;n++)await q('operator',"select public.quote_command('withdraw',$1::jsonb)",[JSON.stringify({offer_id:f})]);
 await assert.rejects(q('importer','select public.award_offer($1)',[f]),/retirada/);
 const c2=await cargo(),f2=await submit(c2,{valid_until:new Date(Date.now()+30000).toISOString()});
 await db.exec("alter table public.offers disable trigger user");
 await db.query("update public.offers set valid_until=now()-interval '1 second' where id=$1",[f2]);
 await db.exec('alter table public.offers enable trigger user');
 await assert.rejects(q('importer','select public.award_offer($1)',[f2]),/vencio/);
});
test('roles ajenos no deciden habilitaciones ni adjudican, archivos históricos siguen presentes',async()=>{
 await assert.rejects(q('importer','select public.admin_review_company($1,$2,$3,$4::jsonb,$5)',[users.operator,'approved','Intento no autorizado','{}',randomUUID()]),/administrativo/);
 const c=await cargo(),f=await submit(c);await assert.rejects(q('operator','select public.award_offer($1)',[f]),/importador/);
 assert.ok((await db.query('select count(*)::int n from public.operations')).rows[0].n>0);
 await assert.rejects(q('admin',"select public.set_approved_capital($1,1,'No reactivar capital')",[users.operator]),/permission denied/);
});
async function paid(){
 const c=await cargo(),f=await submit(c),op=(await q('importer','select public.award_offer($1) id',[f])).rows[0].id;
 const intent=(await db.query('select public.claim_mp_test_checkout($1,$2) r',[users.importer,op])).rows[0].r;
 await db.query('select public.save_mp_test_preference($1,$2,$3,$4)',[users.importer,op,'pref-'+randomUUID(),'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=test']);
 const registered=(await db.query('select * from public.mp_test_checkouts where operation_id=$1',[op])).rows[0];
 const fixture=fakeRegisteredProvider(registered);
 for(let n=0;n<2;n++)await reconcileRegisteredPayment({intent:registered,binding:fixture.binding,provider:fixture.provider,record:payment=>db.query('select public.record_mp_test_payment($1,$2,$3::jsonb)',[users.importer,op,JSON.stringify(payment)])});
 assert.equal((await db.query('select count(*)::int n from public.mp_test_payments where operation_id=$1',[op])).rows[0].n,1);
 return op;
}
async function document(op,actor,type){return(await gatewayDocument(db,users[actor],{target_type:'operation',id:op,document_type:type,kind:type==='Packing list'?'packing_list':'other',storage_path:users[actor]+'/test.pdf',original_name:'prueba.pdf',mime_type:'application/pdf',size_bytes:23})).rows[0].result.id;}
async function delivered(op){
 await assert.rejects(q('operator',"select public.transition_operation($1,'in_progress')",[op]),/packing list/);
 await assert.rejects(document(op,'operator','Packing list'),/importador/);
 await document(op,'importer','Packing list');
 await q('operator',"select public.transition_operation($1,'in_progress')",[op]);
 await q('operator',"select public.transition_operation($1,'awaiting_delivery_confirmation')",[op]);
 await assert.rejects(q('importer',"select public.transition_operation($1,'completed')",[op]),/evidencia/);
 const proof=await document(op,'operator','Constancia de entrega');
 await q('operator',"select public.operator_command('milestone',$1::jsonb)",[JSON.stringify({id:op,event_type:'Entregada',description:'Entrega ficticia con comprobante',location:'Buenos Aires',occurred_at:new Date().toISOString(),attachment_id:proof})]);
 return proof;
}
test('pago local verificado repetido no duplica; packing list tiene responsable; entrega libera una sola vez',async()=>{
 const op=await paid();const proof=await delivered(op);
 for(let n=0;n<2;n++)await q('importer',"select public.transition_operation($1,'completed')",[op]);
 assert.equal((await db.query('select state from public.test_operation_protection where operation_id=$1',[op])).rows[0].state,'released_test');
 const moves=(await db.query("select amount from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows;
 assert.equal(moves.length,1);assert.equal(moves[0].amount,'243750.00');
 assert.equal((await q('competitor','select count(*)::int n from public.test_operation_protection where operation_id=$1',[op])).rows[0].n,0);
 assert.equal((await q('competitor','select count(*)::int n from public.documents where id=$1',[proof])).rows[0].n,0);
 const object=(await db.query('select object_id from public.document_objects where document_id=$1',[proof])).rows[0].object_id;
 assert.equal((await q('competitor','select public.can_read_document_object($1) ok',[object])).rows[0].ok,false);
 assert.equal((await q('importer','select public.can_read_document_object($1) ok',[object])).rows[0].ok,true);
});
test('reclamo pausa liberacion aunque importador confirme entrega; resolucion auditada libera y es idempotente',async()=>{
 const op=await paid();await delivered(op);const key=randomUUID();
 const args=[op,key,'Reclamo ficticio','Diferencia declarada en la prueba de entrega'];
 const claim=(await q('importer','select public.open_operation_claim($1,$2,$3,$4) id',args)).rows[0].id;
 assert.equal((await q('importer','select public.open_operation_claim($1,$2,$3,$4) id',args)).rows[0].id,claim);
 assert.equal((await q('importer','select count(*)::int n from public.support_messages where ticket_id=$1',[claim])).rows[0].n,1);
 assert.equal((await q('competitor','select count(*)::int n from public.support_messages where ticket_id=$1',[claim])).rows[0].n,0);
 await q('importer',"select public.transition_operation($1,'completed')",[op]);
 assert.equal((await db.query('select state from public.test_operation_protection where operation_id=$1',[op])).rows[0].state,'in_review');
 assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,0);
 const resolution=[claim,'resolved',users.admin,'Entrega y evidencia cotejadas en ensayo','release_test',randomUUID()];
 const first=(await q('admin','select public.admin_resolve_operation_claim($1,$2,$3,$4,$5,$6) id',resolution)).rows[0].id;
 assert.equal((await q('admin','select public.admin_resolve_operation_claim($1,$2,$3,$4,$5,$6) id',resolution)).rows[0].id,first);
 assert.equal((await db.query('select state from public.test_operation_protection where operation_id=$1',[op])).rows[0].state,'released_test');
 assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,1);
});
test('una resolucion de reintegro en prueba no genera saldo disponible ni permite resolver desde otro rol',async()=>{
 const op=await paid();await q('operator',"select public.transition_operation($1,'in_progress')",[op]).catch(()=>{});
 const claim=(await q('importer','select public.open_operation_claim($1,$2,$3,$4) id',[op,randomUUID(),'No conformidad ficticia','Reclamo de prueba antes de la entrega'])).rows[0].id;
 const args=[claim,'resolved',users.admin,'Reintegro registrado solo en el circuito de prueba','refund_test',randomUUID()];
 await assert.rejects(q('operator','select public.admin_resolve_operation_claim($1,$2,$3,$4,$5,$6)',args),/administrativo/);
 await q('admin','select public.admin_resolve_operation_claim($1,$2,$3,$4,$5,$6)',args);
 assert.equal((await db.query('select state from public.test_operation_protection where operation_id=$1',[op])).rows[0].state,'refunded_test');
 assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,0);
});
