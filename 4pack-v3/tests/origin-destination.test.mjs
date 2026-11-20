import{test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile,readdir}from'node:fs/promises';import{randomUUID}from'node:crypto';
import{createLocalDatabase,asUser,demoUsers as users}from'../scripts/local-database.mjs';
import assets from'../apps/web/src/features/operator/demo-sql.json'with{type:'json'};
import{positiveDeclared,validateChinaPlan,warehouseAddress}from'../packages/domain/src/china-origin.mjs';
import{quoteFixture}from'./quote-fixture.mjs';
let db,oldCargo,oldOffer,oldOperation,warehouse={},depot={};
const unicode='深圳市 Futian · Depósito Ñandú, José 12';
const q=(actor,sql,args=[])=>asUser(db,users[actor]??actor,sql,args);
const cn={alias:'China DEMO',recipient:'Recepción ficticia 王',phone:'000000000',province:'Guangdong',city:'Shenzhen',district:'Futian',postal_code:'000000',address_zh:unicode,instructions:'Solo ensayo. No enviar mercancía real.',active:true,is_default:true};
const ar={alias:'Argentina DEMO',recipient:'Recepción Ñandú',phone:'000000000',province:'CABA',city:'Buenos Aires',district:'',postal_code:'0000',address:'Depósito ficticio José 123',instructions:'Solo ensayo. Retiro coordinado.',delivery_provinces:['CABA'],active:true,is_default:true};
const plan=(sender='agent',delivery='pickup')=>({version:2,sender_type:sender,sender_name:'Remitente ficticio 王 José',kind:sender==='agent'?'agent':'supplier',handoff:sender==='agent'?'agent_sends':'supplier_sends',package_reference:'B24',origin:{province:'Guangdong',city:'SHENZENG',district:'Futian',address:unicode},destination:{province:'CABA',city:'Buenos Aires',delivery_mode:delivery,address:delivery==='home'?'Domicilio ficticio José 456':''},measurements:{packages:2,weight_kg:20.5,volume_m3:0.45}});
before(async()=>{
 db=await createLocalDatabase();await db.exec('alter table auth.users add column if not exists email_confirmed_at timestamptz default now()');
 const files=(await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&!Object.hasOwn(assets.migrations,n)).sort();
 for(const name of files.filter(n=>n<'20261120220613'))await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 for(const [actor,tax,services]of[['operator','30712345671',['international_transport']],['competitor','20123456786',['international_transport','domestic_delivery']]]){
  await db.query("update public.operator_profiles set verification_status='pending' where user_id=$1",[users[actor]]);
  await q(actor,'select public.submit_company_application($1,$2::jsonb)',[randomUUID(),JSON.stringify({company_name:'Empresa ficticia '+actor,tax_id:tax,origin:'China',destination:'Argentina',services,modes:['air'],document_ids:[],description:'Prueba de recepción y entrega'})]);
  await q('admin',"select public.admin_review_company($1,'approved','Aprobacion ficticia del ensayo',$2::jsonb,$3)",[users[actor],JSON.stringify({identity:true,company:true,documents:true}),randomUUID()]);
  warehouse[actor]=(await q(actor,'select public.save_china_warehouse($1,$2::jsonb) id',[randomUUID(),JSON.stringify(cn)])).rows[0].id;
 }
 const oldPlan={kind:'agent',handoff:'agent_sends',agent_name:'Agente histórico',origin:{province:'Guangdong',city:'SHENZENG',address:unicode},destination:{province:'CABA',city:'Buenos Aires'},measurements:{packages:1,weight_kg:20,length_cm:100,width_cm:100,height_cm:100,estimated:true}};
 oldCargo=(await q('importer','select public.prepare_cargo_publication($1,$2::jsonb) id',[randomUUID(),JSON.stringify({title:'Carga histórica B23',description:'Textiles de prueba histórica',category:'Otro',preferred_mode:'air',fob_usd:1100,origin_plan:oldPlan})])).rows[0].id;
 await q('importer','select public.publish_cargo($1)',[oldCargo]);
 const oldQ=quoteFixture({mode:'air',currency:'ARS',amount:'100000',services:['international_transport']});delete oldQ.working_capital_amount;delete oldQ.working_capital_currency;
 oldOffer=(await q('operator',"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify({submission_key:randomUUID(),cargo_id:oldCargo,quote:{...oldQ,china_warehouse_id:warehouse.operator,receiving_conditions:'Recepción histórica ficticia'}})])).rows[0].r.id;
 await db.exec('update public.mp_test_settings set enabled=true');oldOperation=(await q('importer','select public.award_offer_for_test_checkout($1) id',[oldOffer])).rows[0].id;await db.exec('update public.mp_test_settings set enabled=false');
 for(const name of files.filter(n=>n>='20261120220613'))await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 for(const actor of['operator','competitor'])depot[actor]=(await q(actor,'select public.save_argentina_depot($1,$2::jsonb) id',[randomUUID(),JSON.stringify(ar)])).rows[0].id;
});
after(()=>db?.close());
async function publish(p=plan(),changes={}){
 const key=randomUUID(),payload={title:'Carga B24',description:'Textiles de prueba, datos declarados',category:'Otro',preferred_mode:'air',fob_usd:1100,origin_plan:p,...changes};
 const id=(await q('importer','select public.prepare_cargo_publication($1,$2::jsonb) id',[key,JSON.stringify(payload)])).rows[0].id;
 await q('importer','select public.publish_cargo($1)',[id]);
 assert.equal((await q('importer','select public.prepare_cargo_publication($1,$2::jsonb) id',[key,JSON.stringify(payload)])).rows[0].id,id);return id;
}
function quote(actor='operator',home=false,changes={}){
 const core=quoteFixture({mode:'air',currency:'ARS',amount:home?'125000':'100000',services:home?['international_transport','domestic_delivery']:['international_transport']});
 delete core.working_capital_amount;delete core.working_capital_currency;
 return {...core,china_warehouse_id:warehouse[actor],receiving_conditions:'Recepción ficticia, rotular con referencia',argentina_depot_id:depot[actor],destination_mode:home?'home':'pickup',import_fee:home?'110000':'100000',delivery_fee:home?'15000':'0',home_address_confirmed:home,...changes};
}
async function submit(cargo,actor='operator',home=false,changes={}){
 const payload={cargo_id:cargo,submission_key:randomUUID(),quote:quote(actor,home,changes)};
 const id=(await q(actor,"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify(payload)])).rows[0].r.id;
 assert.equal((await q(actor,"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify(payload)])).rows[0].r.id,id);return id;
}
async function award(id,accepted=false){await db.exec('update public.mp_test_settings set enabled=true');try{return(await q('importer','select public.award_offer_for_test_checkout($1,$2) id',[id,accepted])).rows[0].id;}finally{await db.exec('update public.mp_test_settings set enabled=false');}}
test('cantidades positivas obligatorias, coma o punto; plan nuevo sin medidas estimadas ni retiro',()=>{
 assert.equal(positiveDeclared('0,45'),.45);assert.equal(positiveDeclared('20.50',2),20.5);
 for(const n of['',0,-1,'NaN','Infinity','1,2.3','abc'])assert.throws(()=>positiveDeclared(n));
 assert.equal(validateChinaPlan(plan()),null);assert.match(validateChinaPlan({...plan(),handoff:'pickup'}),/solo recibe/);
 assert.equal(warehouseAddress(cn).includes(unicode),true);
});
test('agente, proveedor particular, tienda y otro: guarda Unicode exacto y cantidades declaradas',async()=>{
 for(const sender of['agent','private_supplier','store','other']){
  const p=plan(sender);p.measurements.weight_kg='20,50';p.measurements.volume_m3='0,45';const id=await publish(p);
  const c=(await q('importer','select origin_plan,weight_kg,volume_m3,origin_country,destination_country,fob_usd from public.cargo_requests where id=$1',[id])).rows[0];
  assert.equal(c.origin_plan.origin.address,unicode);assert.equal(c.origin_plan.measurements.estimated,undefined);assert.equal(c.origin_country,'CN');assert.equal(c.destination_country,'AR');assert.equal(c.weight_kg,'20.50');assert.equal(c.volume_m3,'0.450');assert.equal(c.fob_usd,'1100.00');
 }
});
test('ausencia, cero y negativos no crean carga; retiro en origen y domicilio sin direccion se rechazan',async()=>{
 const before=(await db.query('select count(*)::int n from public.cargo_requests')).rows[0].n;
 for(const key of['weight_kg','volume_m3'])for(const value of['',null,0,-1]){const p=plan();p.measurements[key]=value;await assert.rejects(publish(p),/positivo|rango/);}
 await assert.rejects(publish({...plan(),handoff:'pickup'}),/solo recibe/);
 const p=plan('store','home');p.destination.address='';await assert.rejects(publish(p),/entrega/);
 assert.equal((await db.query('select count(*)::int n from public.cargo_requests')).rows[0].n,before);
});
test('bandeja excluye solamente al que cotizo y su reintento no duplica; otro operador sigue viendo',async()=>{
 const id=await publish(plan('store','home'));assert.equal((await q('operator','select * from public.operator_available_cargos() where cargo_id=$1',[id])).rows.length,1);
 await submit(id);assert.equal((await q('operator','select * from public.operator_available_cargos() where cargo_id=$1',[id])).rows.length,0);assert.equal((await q('competitor','select * from public.operator_available_cargos() where cargo_id=$1',[id])).rows.length,1);
 const f=await submit(id,'competitor',true);assert.equal((await q('competitor','select * from public.operator_available_cargos() where cargo_id=$1',[id])).rows.length,0);
 assert.equal((await db.query('select count(*)::int n from public.offers where cargo_id=$1',[id])).rows[0].n,2);
 const stored=(await db.query('select * from public.offer_destination_terms where offer_id=$1',[f])).rows[0];assert.equal(stored.total,'125000.00');assert.equal(stored.delivery_fee,'15000.00');
});
test('domicilio exige servicio, cobertura y confirmacion; total manipulado, USD y retiro de origen se rechazan',async()=>{
 const id=await publish(plan('private_supplier','home'));
 await assert.rejects(submit(id,'operator',true),/domicilio/);
 await assert.rejects(submit(id,'competitor',true,{home_address_confirmed:false}),/domicilio/);
 await assert.rejects(submit(id,'competitor',true,{amount:'1'}),/total/);
 await assert.rejects(submit(id,'operator',false,{currency:'USD'}),/ARS/);
 await assert.rejects(submit(id,'operator',false,{services:['international_transport','origin_pickup']}),/solo recibe/);
 assert.equal((await db.query('select count(*)::int n from public.offers where cargo_id=$1',[id])).rows[0].n,0);
});
test('oferta de solo retiro requiere aceptacion expresa y conserva direccion de Argentina adjudicada',async()=>{
 const id=await publish(plan('store','home')),f=await submit(id);
 const safe=(await q('importer','select public.china_offer_summaries($1) r',[id])).rows[0].r[0];assert.equal(safe.destination.acceptance_required,true);assert.equal(safe.destination.agreed_mode,'pickup');assert.equal(JSON.stringify(safe).includes(ar.address),false);
 await assert.rejects(award(f),/expresamente/);const op=await award(f,true);assert.equal(await award(f,true),op);
 const content=(await q('importer','select content from public.operation_destination_terms where operation_id=$1',[op])).rows[0].content;assert.equal(content.total,100000);assert.equal(content.pickup_snapshot.address,ar.address);
 await q('operator','select public.save_argentina_depot($1,$2::jsonb)',[randomUUID(),JSON.stringify({...ar,id:depot.operator,address:'Otra dirección ficticia',active:false,is_default:false})]);
 assert.equal((await q('importer','select content from public.operation_destination_terms where operation_id=$1',[op])).rows[0].content.pickup_snapshot.address,ar.address);
 assert.equal((await db.query('select count(*)::int n from public.offer_destination_acceptances where offer_id=$1',[f])).rows[0].n,1);
 await q('operator','select public.save_argentina_depot($1,$2::jsonb)',[randomUUID(),JSON.stringify({...ar,id:depot.operator})]);
});
test('domicilio adjudicado mantiene desglose y checkout toma exactamente el total servidor',async()=>{
 const id=await publish(plan('private_supplier','home')),f=await submit(id,'competitor',true),op=await award(f);
 const claim=(await db.query('select public.claim_mp_test_checkout($1,$2) r',[users.importer,op])).rows[0].r;
 assert.equal(Number(claim.amount),125000);assert.equal(claim.currency,'ARS');
 const terms=(await q('importer','select content from public.operation_destination_terms where operation_id=$1',[op])).rows[0].content;
 assert.equal(terms.import_fee,110000);assert.equal(terms.delivery_fee,15000);assert.equal(terms.agreed_mode,'home');assert.equal(terms.delivery_address.address,plan('private_supplier','home').destination.address);
});
test('recepcion solo registra hito, usa declarados y no libera ni completa; permisos y reintentos',async()=>{
 const id=await publish();await assert.rejects(q('importer',"update public.cargo_requests set volume_m3=999 where id=$1",[id]),/declarados/);const f=await submit(id),op=await award(f),key=randomUUID();
 await assert.rejects(q('operator','select public.record_china_dispatch($1,$2,$3)',[op,randomUUID(),'CN24']),/responsable/);
 await q('importer','select public.record_china_dispatch($1,$2,$3)',[op,randomUUID(),'CN24']);
 await assert.rejects(q('importer','select public.confirm_china_receipt($1,$2)',[op,randomUUID()]),/operador/);
 for(let i=0;i<2;i++)await q('operator','select public.confirm_china_receipt($1,$2)',[op,key]);
 const c=(await q('importer','select state,measured,warehouse_snapshot from public.china_operation_coordination where operation_id=$1',[op])).rows[0];assert.equal(c.state,'received_in_china');assert.equal(c.measured.volume_m3,.45);assert.equal(c.measured.weight_kg,20.5);assert.equal(c.warehouse_snapshot.address_zh,unicode);
 assert.equal((await db.query("select count(*)::int n from public.tracking_events where operation_id=$1 and event_type='china_receipt'",[op])).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,0);
 assert.notEqual((await db.query('select phase from public.operations where id=$1',[op])).rows[0].phase,'completed');
 assert.equal((await q('importer',"update public.cargo_requests set volume_m3=999 where id=$1 returning id",[id])).rows.length,0);
 assert.equal((await q('competitor','select * from public.operation_destination_terms where operation_id=$1',[op])).rows.length,0);
});
test('historial B23 sigue legible sin reescribir su plan, oferta ni operacion',async()=>{
 const c=(await q('importer','select origin_plan,corridor_version from public.cargo_requests where id=$1',[oldCargo])).rows[0];assert.equal(c.corridor_version,'china_origin_v1');assert.equal(c.origin_plan.measurements.estimated,true);
 assert.equal((await q('importer','select * from public.china_operation_coordination where operation_id=$1',[oldOperation])).rows[0].warehouse_snapshot.address_zh,unicode);
 assert.equal((await db.query('select total_usd from public.offers where id=$1',[oldOffer])).rows[0].total_usd,'100000.00');
});
