import {test} from 'node:test';import assert from 'node:assert/strict';import{createHmac,randomUUID}from'node:crypto';
import{reconcileRegisteredPayment,verifyMercadoPagoWebhook}from'../supabase/functions/_shared/mercado-pago-registered.mjs';
import{fakeRegisteredProvider}from'./mvp-payment-fixture.mjs';
const intent=()=>({operation_id:randomUUID(),preference_id:'3858067934-local-fake',preference_state:'ready',external_reference:randomUUID(),amount:250000,currency:'ARS'});
test('preferencia registrada, vendedor y orden coinciden; conserva señal proveedor y clasificación separadas',async()=>{
 const i=intent(),x=fakeRegisteredProvider(i),rows=new Map();let calls=0;
 for(let n=0;n<2;n++)await reconcileRegisteredPayment({intent:i,binding:x.binding,provider:x.provider,record:async p=>{rows.set(p.id,p);calls++;}});
 assert.equal(calls,2);assert.equal(rows.size,1);const p=[...rows.values()][0];assert.equal(p.live_mode,true);assert.equal(p.internal_classification,'test_accounts_linked_preference');assert.equal(p.classification_evidence.provider_is_test_present,false);assert.equal(p.classification_evidence.project_ref,x.binding.project_ref);
});
for(const[name,mutate]of [['vendedor',x=>x.payment.collector_id='1'],['comprador',x=>x.order.payer.id='1'],['referencia',x=>x.payment.external_reference=randomUUID()],['importe',x=>x.preference.items[0].unit_price=1],['moneda',x=>x.payment.currency_id='USD'],['orden/preferencia',x=>x.order.preference_id='otra'],['test seller',x=>x.seller.tags=[]]])test('discrepancia bloquea cualquier escritura: '+name,async()=>{
 const i=intent(),x=fakeRegisteredProvider(i);mutate(x);let records=0;await assert.rejects(reconcileRegisteredPayment({intent:i,binding:x.binding,provider:x.provider,record:async()=>{records++;}}),/MISMATCH/);assert.equal(records,0);
});
test('HMAC válido admite reenvío idempotente; firma alterada, ID diferente y firma vieja no autentican',async()=>{
 const now=Date.now(),ts=String(Math.floor(now/1000)),paymentId='12345',requestId=randomUUID(),secret='synthetic-local-webhook-secret';
 const sign=createHmac('sha256',secret).update(`id:${paymentId};request-id:${requestId};ts:${ts};`).digest('hex');
 const input={signature:`ts=${ts},v1=${sign}`,requestId,paymentId,secret,now};
 assert.equal(await verifyMercadoPagoWebhook(input),true);assert.equal(await verifyMercadoPagoWebhook(input),true);
 assert.equal(await verifyMercadoPagoWebhook({...input,paymentId:'54321'}),false);assert.equal(await verifyMercadoPagoWebhook({...input,secret:'another-synthetic-secret'}),false);
 assert.equal(await verifyMercadoPagoWebhook({...input,now:now+6*60*1000}),false);assert.equal(await verifyMercadoPagoWebhook({...input,signature:'v1='+sign}),false);
});
