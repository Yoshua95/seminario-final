import{test,before,after}from'node:test';import assert from'node:assert/strict';import{readFile,readdir}from'node:fs/promises';import{randomUUID}from'node:crypto';
import{createLocalDatabase,asUser,demoUsers as users}from'../scripts/local-database.mjs';
import assets from'../apps/web/src/features/operator/demo-sql.json'with{type:'json'};
import{measuredVolume,validateChinaPlan,argentinaProvinces}from'../packages/domain/src/china-origin.mjs';
import{quoteFixture}from'./quote-fixture.mjs';
import{deriveOperationTask}from'../packages/domain/src/operation-work.mjs';
let db,warehouse;
const q=(actor,sql,args=[])=>asUser(db,users[actor]??actor,sql,args);
const measurement={packages:2,weight_kg:20,length_cm:100,width_cm:50,height_cm:40,estimated:true};
const plan=(kind='agent',handoff=kind==='agent'?'agent_sends':'supplier_sends')=>({kind,handoff,agent_name:'Agente ficticio',package_reference:'DEMO-23',origin:{province:'Guangdong',city:'SHENZENG',district:'Distrito de prueba',address:'Origen ficticio 123'},destination:{province:'CABA',city:'Buenos Aires',district:'',address:''},measurements:measurement});
const location={alias:'Deposito demo China',recipient:'Recepcion ficticia',phone:'000000000',province:'Guangdong',city:'Shenzhen',district:'Distrito demo',postal_code:'000000',address_zh:'演示仓库地址 123（非真实地址）',instructions:'Datos ficticios. Identificar los bultos con la referencia.',active:true,is_default:true};
before(async()=>{
 db=await createLocalDatabase();await db.exec('alter table auth.users add column if not exists email_confirmed_at timestamptz default now()');
 for(const name of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(n=>n.endsWith('.sql')&&!Object.hasOwn(assets.migrations,n)).sort())await db.exec(await readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
 await db.query("update public.operator_profiles set verification_status='pending' where user_id=$1",[users.operator]);
 await q('operator','select public.submit_company_application($1,$2::jsonb)',[randomUUID(),JSON.stringify({company_name:'Empresa origen ficticia',tax_id:'30712345671',origin:'China',destination:'Argentina',services:['international_transport'],modes:['air'],document_ids:[],description:'Empresa ficticia para coordinar origen'})]);
 await q('admin',"select public.admin_review_company($1,'approved','Revision ficticia de habilitacion',$2::jsonb,$3)",[users.operator,JSON.stringify({identity:true,company:true,documents:true}),randomUUID()]);
 warehouse=(await q('operator','select public.save_china_warehouse($1,$2::jsonb) id',[randomUUID(),JSON.stringify(location)])).rows[0].id;
});after(()=>db?.close());
async function publish(p=plan(),city){if(city)p.origin.city=city;const request=randomUUID(),payload={title:'Textiles ensayo China',description:'Indumentaria de algodon de prueba',category:'Otro',preferred_mode:'air',fob_usd:1100,origin_plan:p};
 const id=(await q('importer','select public.prepare_cargo_publication($1,$2::jsonb) id',[request,JSON.stringify(payload)])).rows[0].id;await q('importer','select public.publish_cargo($1)',[id]);
 assert.equal((await q('importer','select public.prepare_cargo_publication($1,$2::jsonb) id',[request,JSON.stringify(payload)])).rows[0].id,id);return id;}
async function offer(cargo,changes={}){const quote=quoteFixture({currency:'ARS',amount:'250000',services:['international_transport'],mode:'air',...changes});delete quote.working_capital_amount;delete quote.working_capital_currency;quote.china_warehouse_id=warehouse;quote.receiving_conditions='Se reciben bultos identificados con referencia de operacion.';quote.pickup_included=changes.pickup_included??false;quote.pickup_conditions=changes.pickup_conditions??'';
 const payload={cargo_id:cargo,submission_key:randomUUID(),quote};const first=(await q('operator',"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify(payload)])).rows[0].r.id;assert.equal((await q('operator',"select public.quote_command('submit',$1::jsonb) r",[JSON.stringify(payload)])).rows[0].r.id,first);return first;}
async function award(offer){await db.exec('update public.mp_test_settings set enabled=true');try{return(await q('importer','select public.award_offer_for_test_checkout($1) id',[offer])).rows[0].id;}finally{await db.exec('update public.mp_test_settings set enabled=false');}}
test('volumen por bulto y 23 provincias mas CABA; estimado no es cero ni desconocido',()=>{assert.equal(argentinaProvinces.length,24);assert.equal(measuredVolume(measurement),0.4);assert.equal(validateChinaPlan(plan()),null);assert.match(validateChinaPlan({...plan(),destination:{province:'Provincia inventada',city:'x'}}),/provincia/);assert.throws(()=>measuredVolume({...measurement,length_cm:0}));});
test('proxima accion distingue despacho, retiro, recepcion y revision; origen no es entrega final',()=>{
 const base={role:'importer',phase:'confirmed',paymentApproved:true,requiredDocuments:[],documents:[]};
 for(const [handoff,owner]of[['agent_sends','importer'],['supplier_sends','importer'],['pickup','operator']]){
  const task=deriveOperationTask({...base,chinaOrigin:{state:'awaiting_dispatch',handoff}});
  assert.equal(task.action,'china_dispatch');assert.equal(task.responsible,owner);
 }
 assert.equal(deriveOperationTask({...base,chinaOrigin:{state:'in_transit_to_warehouse',handoff:'supplier_sends'}}).responsible,'operator');
 assert.equal(deriveOperationTask({...base,chinaOrigin:{state:'received_in_china',handoff:'supplier_sends',revisionPending:true}}).action,'china_revision');
 assert.equal(deriveOperationTask({...base,chinaOrigin:{state:'received_in_china',handoff:'supplier_sends',economicAdjustment:true}}).action,'review_adjustment');
 assert.notEqual(deriveOperationTask({...base,chinaOrigin:{state:'received_in_china',handoff:'supplier_sends'}}).action,'confirm_delivery');
});
test('backend asigna CN-AR, calcula volumen y rechaza corredor/provincia/medidas falsos',async()=>{
 const id=await publish();const c=(await db.query('select * from public.cargo_requests where id=$1',[id])).rows[0];assert.equal(c.origin_country,'CN');assert.equal(c.destination_country,'AR');assert.equal(c.volume_m3,'0.400');assert.equal(c.origin_plan.measurements.estimated,true);
 await assert.rejects(q('importer','select public.prepare_cargo_publication($1,$2::jsonb)',[randomUUID(),JSON.stringify({origin_country:'US',origin_plan:plan()})]),/corredor/);
 await assert.rejects(q('importer',"insert into public.cargo_requests(importer_id,title)values($1,'bypass')",[users.importer]),/permission denied/);
 await assert.rejects(q('importer',"update public.cargo_requests set origin_country='US' where id=$1",[id]),/coordinacion|constraint/);
});
test('SHENZENG, Shenzhen y SHENZHEN son igualmente elegibles sin analizar la ciudad',async()=>{for(const city of ['SHENZENG','Shenzhen','SHENZHEN']){const id=await publish(plan(),city);assert.equal((await q('operator','select public.operator_compatible($1,$2) ok',[users.operator,id])).rows[0].ok,true);assert.equal((await q('operator','select count(*)::int n from public.cargo_requests where id=$1',[id])).rows[0].n,1);}});
test('retiro requiere habilitacion especifica y condiciones; modalidad incompatible excluida',async()=>{
 const id=await publish(plan('agent','pickup'));assert.equal((await q('operator','select count(*)::int n from public.cargo_requests where id=$1',[id])).rows[0].n,0);
 await assert.rejects(offer(id,{pickup_included:true,pickup_conditions:'Retiro ficticio incluido'}),/habilitada/);
 await db.query("update public.operator_authorizations set services=array['international_transport','origin_pickup'] where operator_id=$1",[users.operator]);
 await assert.rejects(offer(id),/retiro/);await offer(id,{services:['international_transport','origin_pickup'],pickup_included:true,pickup_conditions:'Retiro ficticio incluido previa coordinacion'});
 await db.query("update public.cargo_requests set preferred_mode='sea' where id=$1",[id]);assert.equal((await q('operator','select public.operator_compatible($1,$2) ok',[users.operator,id])).rows[0].ok,false);
 await db.query("update public.operator_authorizations set services=array['international_transport'] where operator_id=$1",[users.operator]);
});
test('caso A: ficha privada hasta adjudicar, direccion congelada, despacho y recepcion idempotentes sin liberar',async()=>{
 const id=await publish(),f=await offer(id);assert.equal((await q('importer','select count(*)::int n from public.china_warehouses')).rows[0].n,0);assert.equal((await q('importer','select count(*)::int n from public.offer_china_receipt_terms where offer_id=$1',[f])).rows[0].n,0);
 const quote=(await q('importer','select normalized_quote from public.offers where id=$1',[f])).rows[0].normalized_quote;assert.equal(JSON.stringify(quote).includes(location.address_zh),false);
 const summaries=(await q('importer','select public.china_offer_summaries($1) data',[id])).rows[0].data;assert.equal(summaries[0].warehouse.city,'Shenzhen');assert.equal(JSON.stringify(summaries).includes(location.address_zh),false);
 const op=await award(f);assert.equal(await award(f),op);assert.equal((await q('importer','select count(*)::int n from public.offer_china_receipt_terms where offer_id=$1',[f])).rows[0].n,1);
 await q('operator','select public.save_china_warehouse($1,$2::jsonb)',[randomUUID(),JSON.stringify({...location,id:warehouse,address_zh:'Nueva direccion ficticia',active:false,is_default:false})]);
 assert.equal((await q('importer','select warehouse_snapshot from public.china_operation_coordination where operation_id=$1',[op])).rows[0].warehouse_snapshot.address_zh,location.address_zh);
 await assert.rejects(q('operator','select public.record_china_dispatch($1,$2,$3)',[op,randomUUID(),'CN-TEST']),/responsable/);
 const key=randomUUID();for(let i=0;i<2;i++)await q('importer','select public.record_china_dispatch($1,$2,$3)',[op,key,'CN-TEST']);
 await assert.rejects(q('importer','select public.confirm_china_receipt($1,$2,$3::jsonb)',[op,randomUUID(),JSON.stringify({...measurement,estimated:false})]),/operador/);
 const receipt=randomUUID();for(let i=0;i<2;i++)await q('operator','select public.confirm_china_receipt($1,$2,$3::jsonb)',[op,receipt,JSON.stringify({...measurement,estimated:false,weight_kg:22})]);
 assert.equal((await q('importer','select state from public.china_operation_coordination where operation_id=$1',[op])).rows[0].state,'received_in_china');
 assert.equal((await db.query("select count(*)::int n from public.tracking_events where operation_id=$1 and event_type='china_receipt'",[op])).rows[0].n,1);
 assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,0);
 await q('operator','select public.save_china_warehouse($1,$2::jsonb)',[randomUUID(),JSON.stringify({...location,id:warehouse})]);
});
test('caso B: proveedor estimado, recepcion real, anexo aceptado conserva ambas versiones y no altera pago',async()=>{
 const id=await publish(plan('supplier')),op=await award(await offer(id));await q('importer','select public.record_china_dispatch($1,$2,$3)',[op,randomUUID(),'SUPPLIER-TEST']);
 await q('operator','select public.confirm_china_receipt($1,$2,$3::jsonb)',[op,randomUUID(),JSON.stringify({...measurement,estimated:false,weight_kg:25,height_cm:50})]);
 const terms={amount_ars:300000,currency:'ARS',estimated_days:10,reason:'Medidas reales diferentes de las estimadas',conditions:'Anexo de prueba requiere aceptacion expresa'};
 const rev=(await q('operator','select public.propose_china_revision($1,$2,$3::jsonb) id',[op,randomUUID(),JSON.stringify(terms)])).rows[0].id;
 await assert.rejects(q('importer',"select public.transition_operation($1,'confirmed')",[op]),/decidir/);
 await assert.rejects(q('operator','select public.decide_china_revision($1,$2,true)',[rev,randomUUID()]),/importador/);
 const key=randomUUID();for(let i=0;i<2;i++)await q('importer','select public.decide_china_revision($1,$2,true)',[rev,key]);
 const r=(await q('importer','select * from public.china_receipt_revisions where id=$1',[rev])).rows[0];assert.equal(r.status,'accepted');assert.equal(r.amount_ars,'300000.00');assert.equal(r.previous_terms.quote.amount,'250000');
 assert.equal((await db.query('select content from public.operation_contract_snapshots where operation_id=$1',[op])).rows[0].content.quote.amount,'250000');
 await assert.rejects(q('importer',"select public.transition_operation($1,'confirmed')",[op]),/conciliacion adicional/);
 await assert.rejects(q('competitor','select * from public.china_operation_coordination where operation_id=$1',[op]).then(r=>{assert.equal(r.rows.length,0);throw Error('foreign_read_denied');}),/foreign_read_denied/);
 await assert.rejects(q('importer',"update public.china_receipt_revisions set amount_ars=1 where id=$1",[rev]),/permission denied/);
});
test('retiro contratado: solo el operador registra el retiro y llega a recepcion sin cierre financiero',async()=>{
 await db.query("update public.operator_authorizations set services=array['international_transport','origin_pickup'] where operator_id=$1",[users.operator]);
 try{
  const id=await publish(plan('agent','pickup')),op=await award(await offer(id,{services:['international_transport','origin_pickup'],pickup_included:true,pickup_conditions:'Retiro ficticio acordado con el agente'}));
  await assert.rejects(q('importer','select public.record_china_dispatch($1,$2,$3)',[op,randomUUID(),'RETIRO-B23']),/responsable/);
  const key=randomUUID();for(let i=0;i<2;i++)await q('operator','select public.record_china_dispatch($1,$2,$3)',[op,key,'RETIRO-B23']);
  await q('operator','select public.confirm_china_receipt($1,$2,$3::jsonb)',[op,randomUUID(),JSON.stringify({...measurement,estimated:false})]);
  assert.equal((await q('importer','select state from public.china_operation_coordination where operation_id=$1',[op])).rows[0].state,'received_in_china');
  assert.equal((await db.query("select count(*)::int n from public.tracking_events where operation_id=$1 and event_type='china_dispatch'",[op])).rows[0].n,1);
  assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1 and kind='release'",[op])).rows[0].n,0);
 }finally{await db.query("update public.operator_authorizations set services=array['international_transport'] where operator_id=$1",[users.operator]);}
});
