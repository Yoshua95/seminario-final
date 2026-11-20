import{test,after}from'node:test';import assert from'node:assert/strict';import fs from'node:fs/promises';import ts from'typescript';import{createHmac,randomUUID}from'node:crypto';import{fakeRegisteredProvider}from'./mvp-payment-fixture.mjs';
const project='khtfjogqvtjuxhmzkmue',operation=randomUUID(),actor=randomUUID();let authenticated=true,owner=true,enabled='false',dbEnabled=false,hasIntent=true,fetchCalls=0,rpcCalls=0;
const intent={operation_id:operation,preference_id:'3858067934-local-fake',preference_state:'ready',checkout_url:'https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=fake',external_reference:randomUUID(),amount:250000,currency:'ARS',status:'pending'};
const fixture=fakeRegisteredProvider(intent),rows=new Map(),handlers={};
const env={SUPABASE_URL:`https://${project}.supabase.co`,SUPABASE_ANON_KEY:'local-anon',SUPABASE_SERVICE_ROLE_KEY:'local-service',MP_TEST_SELLER_ID:fixture.binding.seller_id,MP_TEST_ACCESS_TOKEN:'synthetic-test-token',MP_TEST_WEBHOOK_SECRET:'synthetic-local-webhook-secret'};
const originalFetch=globalThis.fetch,originalDeno=globalThis.Deno;
globalThis.__mvpClient=()=>({auth:{getUser:async()=>({data:{user:authenticated?{id:actor}:null},error:authenticated?null:{code:'INVALID_JWT'}})},from(table){const filters={};const builder={select(){return builder;},eq(k,v){filters[k]=v;return builder;},async single(){if(table==='operations')return owner?{data:{id:operation,importer_id:actor,payment_mode:'mercado_pago_test',contract_currency:'ARS',workflow_version:'mvp_delivery_v1'},error:null}:{data:null,error:{code:'NOT_FOUND'}};if(table==='mp_test_settings')return{data:{enabled:dbEnabled}};if(table==='mp_test_provider_binding')return{data:fixture.binding};if(table==='mp_test_checkouts')return{data:hasIntent?intent:null,error:hasIntent?null:{code:'NOT_FOUND'}};throw Error('UNKNOWN_TABLE');},async maybeSingle(){return hasIntent?builder.single():{data:null,error:null};}};return builder;},async rpc(name,args){rpcCalls++;assert.equal(name,'record_mp_test_payment');assert.equal(args.actor,actor);assert.equal(args.target,operation);rows.set(args.payment.id,args.payment);intent.status=args.payment.status;return{data:null,error:null};}});
globalThis.fetch=async(raw)=>{fetchCalls++;const url=new URL(raw);assert.equal(url.hostname,'api.mercadopago.com');return Response.json(await fixture.provider.get(url.pathname+url.search));};
let current='';globalThis.Deno={env:{get:k=>k==='MP_TEST_ENABLED'?enabled:env[k]},serve:handler=>{handlers[current]=handler;}};
for(const name of['mercado-pago-mvp-test','mercado-pago-mvp-webhook']){
 current=name;let source=await fs.readFile(new URL('../supabase/functions/'+name+'/index.ts',import.meta.url),'utf8');
 source=source.replace(/import \{\s*createClient\s*\} from "npm:@supabase\/supabase-js@2\.119\.0";/,'const createClient=globalThis.__mvpClient;');
 for(const file of['mercado-pago-test.mjs','mercado-pago-registered.mjs'])source=source.replace('"../_shared/'+file+'"',JSON.stringify(new URL('../supabase/functions/_shared/'+file,import.meta.url).href));
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
 await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const call=(body,method='POST')=>handlers['mercado-pago-mvp-test'](new Request('https://test.invalid',{method,...(method==='POST'?{body:JSON.stringify(body)}:{})}));
test('sesion, propietario y cuerpo estricto se validan antes del proveedor',async()=>{
 const start=fetchCalls;authenticated=false;assert.equal((await call({action:'sync',operation_id:operation})).status,401);authenticated=true;owner=false;assert.equal((await call({action:'sync',operation_id:operation})).status,403);owner=true;
 assert.equal((await call({action:'sync',operation_id:operation,amount:1})).status,400);assert.equal(fetchCalls,start);
});
test('creacion apagada conserva la preferencia existente sin POST al proveedor',async()=>{
 const start=fetchCalls;const response=await call({action:'checkout',operation_id:operation});assert.equal(response.status,200);assert.equal((await response.json()).checkout_url,intent.checkout_url);assert.equal(fetchCalls,start);
 hasIntent=false;assert.equal((await call({action:'checkout',operation_id:operation})).status,503);hasIntent=true;assert.equal(fetchCalls,start);
});
test('vinculo discordante bloquea la RPC y dos sync correctos conservan un solo pago',async()=>{
 const old=fixture.order.preference_id;fixture.order.preference_id='wrong';const start=rpcCalls;assert.equal((await call({action:'sync',operation_id:operation})).status,409);assert.equal(rpcCalls,start);fixture.order.preference_id=old;
 for(let n=0;n<2;n++){const response=await call({action:'sync',operation_id:operation});assert.equal(response.status,200);assert.equal((await response.json()).status,'approved');}
 assert.equal(rows.size,1);assert.equal([...rows.values()][0].live_mode,true);
});
test('webhook sin HMAC no consulta; notificacion firmada repetida consulta API y no duplica pago',async()=>{
 const id=String(fixture.payment.id),requestId=randomUUID(),timestamp=String(Math.floor(Date.now()/1000));
 const url='https://test.invalid?data.id='+id,body=JSON.stringify({type:'payment',data:{id}}),start=fetchCalls;
 assert.equal((await handlers['mercado-pago-mvp-webhook'](new Request(url,{method:'POST',body}))).status,401);assert.equal(fetchCalls,start);
 const signature=createHmac('sha256',env.MP_TEST_WEBHOOK_SECRET).update(`id:${id};request-id:${requestId};ts:${timestamp};`).digest('hex');
 for(let n=0;n<2;n++){const r=await handlers['mercado-pago-mvp-webhook'](new Request(url,{method:'POST',body,headers:{'x-signature':`ts=${timestamp},v1=${signature}`,'x-request-id':requestId}}));assert.equal(r.status,200);}
 assert.equal(rows.size,1);assert.ok(fetchCalls>start);
});
after(()=>{globalThis.fetch=originalFetch;globalThis.Deno=originalDeno;delete globalThis.__mvpClient;});
