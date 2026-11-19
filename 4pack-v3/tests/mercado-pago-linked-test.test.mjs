import{test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{randomUUID}from'node:crypto';
import{verifyLinkedTestPayment,linkedTestCase as c}from'../supabase/functions/_shared/mercado-pago-linked-test.mjs';
import{createLocalDatabase,asUser,demoUsers as u}from'../scripts/local-database.mjs';import{quoteFixture}from'./quote-fixture.mjs';
function fixture(){return{
 payment:{id:c.payment,collector_id:c.seller,payer:{id:c.buyer},external_reference:c.reference,currency_id:'ARS',transaction_amount:250000,live_mode:true,status:'approved',date_last_updated:new Date().toISOString(),order:{id:'46229755733'}},
 order:{id:'46229755733',preference_id:c.preference,external_reference:c.reference,collector:{id:c.seller},payer:{id:c.buyer},total_amount:250000,payments:[{id:c.payment,status:'approved',transaction_amount:250000}]},
 preference:{id:c.preference,collector_id:c.seller,external_reference:c.reference,metadata:{operation_id:c.operation,fourpack_test:true},items:[{id:c.operation,quantity:1,currency_id:'ARS',unit_price:250000}]},
 seller:{id:c.seller,site_id:'MLA',tags:['test_user']},buyer:{id:c.buyer,site_id:'MLA',tags:[]},
 intent:{operation_id:c.operation,preference_id:c.preference,preference_state:'ready',external_reference:c.reference,currency:'ARS',amount:250000},
};}
test('clasificación interna conserva live_mode=true sin inventar is_test ni etiqueta del comprador',()=>{const r=verifyLinkedTestPayment(fixture());assert.equal(r.live_mode,true);assert.equal(r.classification_evidence.provider_is_test_present,false);assert.equal(r.classification_evidence.provider_is_test,null);assert.equal(r.classification_evidence.buyer_test_user_tag,false);assert.equal(r.internal_classification,'test_accounts_linked_preference');});
for(const[title,mutate]of[
 ['vendedor',x=>x.payment.collector_id='1'],['comprador',x=>x.payment.payer.id='1'],['test seller',x=>x.seller.tags=[]],['referencia',x=>x.payment.external_reference='other'],['moneda',x=>x.payment.currency_id='USD'],['importe',x=>x.payment.transaction_amount=1],['live_mode texto',x=>x.payment.live_mode='true'],['preferencia de orden',x=>x.order.preference_id='other'],['pago de orden',x=>x.order.payments=[]],['orden distinta',x=>x.order.id='9'],['comprador de orden',x=>x.order.payer.id='1'],['operación de preferencia',x=>x.preference.metadata.operation_id=randomUUID()],['marca test texto',x=>x.preference.metadata.fourpack_test='true'],['importe de preferencia',x=>x.preference.items[0].unit_price=1],['preferencia no registrada',x=>x.intent.preference_id='other'],['preferencia no lista',x=>x.intent.preference_state='creating'],
])test('discrepancia bloquea: '+title,()=>{const x=fixture();mutate(x);assert.throws(()=>verifyLinkedTestPayment(x),/EVIDENCE_MISMATCH/);});

let db,baseline;
before(async()=>{
 db=await createLocalDatabase();baseline=(await db.query("select operation_id,currency,contract_exposure,working_capital_required,state from operation_capacity_reservations order by operation_id")).rows;
 await db.exec("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if; end $$;");
 if(!(await db.query("select to_regclass('public.mp_test_checkouts') r")).rows[0].r)await db.exec(await readFile(new URL('../supabase/migrations/0024_mercado_pago_test.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261119051337_mp_linked_test_payment_evidence.sql',import.meta.url),'utf8'));
 const operator=randomUUID(),cargo=randomUUID();await db.query('insert into auth.users(id,email) values($1,$2)',[operator,'linked-mp@test.invalid']);await db.query("update profiles set role='operator' where id=$1",[operator]);await db.query("insert into operator_profiles(user_id,company_name,tax_id,verification_status) values($1,'MP linked test','DEMO','approved')",[operator]);
 await asUser(db,u.admin,'select public.configure_operator_capacity($1,$2::jsonb)',[operator,JSON.stringify({currency:'ARS',max_operations:'3',max_per_operation:'300000',max_exposure:'900000',declared_working_capital:'300000',approved_working_capital:'300000',status:'active',valid_from:'2020-01-01T00:00:00Z',reason:'Prueba local ficticia'})]);
 await db.query("insert into cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,$2,'Linked test','Textiles','A','B','Textiles',10,.5,1100,'open',now()+interval '1 day')",[cargo,u.importer]);
 const quote=(await asUser(db,operator,"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify({cargo_id:cargo,quote:quoteFixture({currency:'ARS',amount:'250000',working_capital_amount:'100000'})})])).rows[0].r;
 await db.exec('update mp_test_settings set enabled=true');
 await db.query("insert into operations(id,cargo_id,accepted_offer_id,importer_id,operator_id,contract_currency) values($1,$2,$3,$4,$5,'ARS')",[c.operation,cargo,quote.id,u.importer,operator]);
 await db.query("insert into payment_guarantees(operation_id,amount_usd,commission_usd,currency,status) values($1,250000,6250,'ARS','pending') on conflict(operation_id) do nothing",[c.operation]);
 await db.query("insert into mp_test_checkouts(operation_id,external_reference,amount,currency,preference_id,preference_state) values($1,$2,250000,'ARS',$3,'ready')",[c.operation,c.reference,c.preference]);await db.exec('update mp_test_settings set enabled=false');
});
after(async()=>db?.close());
function payload(){const p=verifyLinkedTestPayment(fixture());p.classification_evidence.checked_at=new Date().toISOString();p.classification_evidence.provider_response_sha256=Object.fromEntries(['payment','order','preference','seller','buyer'].map(k=>[k,'a'.repeat(64)]));return p;}
const record=p=>db.query('select record_mp_test_payment($1,$2,$3::jsonb)',[u.importer,c.operation,JSON.stringify(p)]);
test('RPC rechaza discrepancias y no inserta ni cambia garantía',async()=>{
 for(const mutate of[p=>p.currency_id='USD',p=>p.transaction_amount=1,p=>p.live_mode='true',p=>delete p.classification_evidence,p=>p.classification_evidence.preference_id='other',p=>p.classification_evidence.checks.order_payment=false,p=>p.classification_evidence.provider_response_sha256.order='bad',p=>p.payer_id='other']){const p=payload();mutate(p);await assert.rejects(record(p));}
 assert.equal((await db.query('select count(*)::int n from mp_test_payments')).rows[0].n,0);assert.equal((await db.query('select status from payment_guarantees where operation_id=$1',[c.operation])).rows[0].status,'pending');
});
test('live_mode=true sin clasificación sigue rechazado aunque se alegue is_test',async()=>{
 for(const value of[undefined,false,'true',true]){const p=payload();delete p.internal_classification;delete p.classification_evidence;if(value!==undefined)p.is_test=value;await assert.rejects(record(p),/incompatible/);}
});
test('solo backend puede registrar; idempotencia conserva un pago, señal original y evidencia',async()=>{
 const p=payload();await assert.rejects(asUser(db,u.importer,'select record_mp_test_payment($1,$2,$3::jsonb)',[u.importer,c.operation,JSON.stringify(p)]),/permission denied/);
 await record(p);const first=(await db.query('select verified_at from payment_guarantees where operation_id=$1',[c.operation])).rows[0].verified_at;await record(p);
 const rows=(await db.query('select * from mp_test_payments where operation_id=$1',[c.operation])).rows;assert.equal(rows.length,1);assert.equal(rows[0].provider_live_mode,true);assert.equal(rows[0].internal_classification,'test_accounts_linked_preference');assert.equal(rows[0].classification_evidence.order_id,'46229755733');
 const g=(await db.query('select status,verified_at from payment_guarantees where operation_id=$1',[c.operation])).rows[0];assert.equal(g.status,'held_simulated');assert.deepEqual(g.verified_at,first);
 const old=(await db.query('select operation_id,currency,contract_exposure,working_capital_required,state from operation_capacity_reservations where operation_id<>$1 order by operation_id',[c.operation])).rows;assert.deepEqual(old,baseline);
});
