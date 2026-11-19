import {test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{randomUUID}from'node:crypto';
import{createLocalDatabase,asUser,demoUsers as users}from'../scripts/local-database.mjs';import{quoteFixture}from'./quote-fixture.mjs';
let db,historical,legacyOffer,cargo;
const q=(who,sql,args=[])=>asUser(db,users[who],sql,args);
before(async()=>{
 db=await createLocalDatabase();
 await db.exec("do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $$;");
 historical=(await db.query("select id,contract_currency,phase from public.operations where contract_currency='USD' order by id")).rows;
 legacyOffer=(await db.query("select id from public.offers where payment_currency='USD' and status='submitted' limit 1")).rows[0]?.id;
 await db.exec(await readFile(new URL('../supabase/migrations/20261119024020_ars_only_new_contracts.sql',import.meta.url),'utf8'));
 cargo=randomUUID();await db.query("insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)values($1,$2,'ARS test','Carga estandar','A','B','Textiles',1,0.1,1100,'open',now()+interval '1 day')",[cargo,users.importer]);
});
after(async()=>db?.close());
test('ARS: nueva oferta y adjudicacion conservan FOB USD',async()=>{
 const offer=(await q('operator',"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify({cargo_id:cargo,quote:quoteFixture({currency:'ARS',amount:'25000',working_capital_amount:'1000'})})])).rows[0].r;
 const op=(await q('importer','select public.award_offer($1) id',[offer.id])).rows[0].id;
 assert.equal((await db.query('select contract_currency from public.operations where id=$1',[op])).rows[0].contract_currency,'ARS');
 assert.equal((await db.query('select currency from public.operation_capacity_reservations where operation_id=$1',[op])).rows[0].currency,'ARS');
 assert.equal(Number((await db.query('select fob_usd from public.cargo_requests where id=$1',[cargo])).rows[0].fob_usd),1100);
 assert.equal((await q('importer','select public.award_offer($1) id',[offer.id])).rows[0].id,op);
});
test('USD: nuevas ofertas, borradores y limites son rechazados',async()=>{
 for(const command of ['save','submit','revise'])await assert.rejects(q('operator','select public.quote_command($1,$2::jsonb)',[command,JSON.stringify({cargo_id:cargo,quote:quoteFixture({currency:'USD'})})]),/ARS/);
 await assert.rejects(q('admin','select public.configure_operator_capacity($1,$2::jsonb)',[users.operator,JSON.stringify({currency:'USD'})]),/ARS/);
 const open=randomUUID();await db.query("insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)values($1,$2,'USD rejection','Estandar','A','B','Textiles',1,0.1,1100,'open',now()+interval '1 day')",[open,users.importer]);
 await assert.rejects(db.query("insert into public.offers(cargo_id,operator_id,mode,freight_usd,estimated_days,payment_currency,valid_until)values($1,$2,'air',1,1,'USD',now()+interval '1 day')",[open,users.competitor]),/ARS/);
});
test('USD historico: lectura intacta, no nueva adjudicacion',async()=>{
 assert(historical.length>0);
 const after=(await q('importer',"select id,contract_currency,phase from public.operations where contract_currency='USD' order by id")).rows;
 assert.deepEqual(after,historical);
 if(legacyOffer)await assert.rejects(q('importer','select public.award_offer($1)',[legacyOffer]),/ARS/);
});
