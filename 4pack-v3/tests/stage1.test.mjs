import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createLocalDatabase, asUser, demoUsers as users } from "../scripts/local-database.mjs";
import { gatewayDocument } from "./document-gateway-helper.mjs";
import { validateDocumentBytes } from "../supabase/functions/_shared/document-validation.mjs";
let db;
before(async()=>{db=await createLocalDatabase();});
after(async()=>{await db?.close();});
const q=(user,sql,params=[])=>asUser(db,users[user],sql,params);
async function offer(currency="USD", operator=users.operator) {
  const cargo=randomUUID(), id=randomUUID();
  await db.query("insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,$2,'Test','Test','A','B','Test',1,1,99999,'open',now()+interval '1 day')",[cargo,users.importer]);
  await db.query("insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until,payment_currency) values($1,$2,$3,'air',1000,3,'Servicio',now()+interval '1 hour',$4)",[id,cargo,operator,currency]);
  return {id,cargo};
}
const award=id=>q("importer","select public.award_offer($1) as id",[id]);
test("oferta vencida y operador suspendido no se adjudican",async()=>{
  const expired=await offer();
  await db.query("update public.offers set valid_until=now()-interval '1 second' where id=$1",[expired.id]).catch(async()=>{
    // Sealed-price trigger forbids mutation; expiry is emulated with a transaction-local clock-independent past offer.
    await db.exec("alter table public.offers disable trigger guard_sealed_offer");
    try { await db.query("update public.offers set valid_until=now()-interval '1 second' where id=$1",[expired.id]); }
    finally { await db.exec("alter table public.offers enable trigger guard_sealed_offer"); }
  });
  await assert.rejects(award(expired.id),/vencida/);
  const suspended=await offer("USD",users.competitor);
  await db.query("update public.operator_profiles set verification_status='suspended' where user_id=$1",[users.competitor]);
  await assert.rejects(award(suspended.id),/suspendido/);
  await db.query("update public.operator_profiles set verification_status='approved' where user_id=$1",[users.competitor]);
});
test("reintento recupera la misma operación y doble adjudicación no duplica",async()=>{
  const f=await offer();
  const second=randomUUID();
  await db.query("insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until) values($1,$2,$3,'air',1100,3,'Otro',now()+interval '1 hour')",[second,f.cargo,users.competitor]);
  const first=(await award(f.id)).rows[0].id;
  assert.equal((await award(f.id)).rows[0].id,first);
  await assert.rejects(award(second),/ya fue adjudicada/);
  assert.equal((await db.query("select count(*)::int as n from public.operations where cargo_id=$1",[f.cargo])).rows[0].n,1);
  await assert.rejects(q("competitor","select public.award_offer($1)",[f.id]),/autorizada/);
});
test("adjudicaciones solapadas simuladas se serializan en PGlite",async()=>{
  const f=await offer();
  const attempts=await Promise.all([award(f.id),award(f.id),award(f.id)]);
  assert.equal(new Set(attempts.map(r=>r.rows[0].id)).size,1);
  const competing=await offer(); const second=randomUUID();
  await db.query("insert into public.offers(id,cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until) values($1,$2,$3,'air',1100,3,'Otro',now()+interval '1 hour')",[second,competing.cargo,users.competitor]);
  const results=await Promise.allSettled([award(competing.id),award(second)]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  assert.equal(results.filter(r=>r.status==='rejected').length,1);
  assert.equal((await db.query("select count(*)::int n from public.operations where cargo_id=$1",[competing.cargo])).rows[0].n,1);
  // PGlite serializes transactions; this is not a multi-connection PostgreSQL deadlock test.
});
test("transiciones validan rol, contrato, garantía y cierre por importador",async()=>{
  const f=await offer();const id=(await award(f.id)).rows[0].id;
  await assert.rejects(q("operator","select public.transition_operation($1,'in_progress')",[id]),/inválida/);
  await assert.rejects(q("importer","select public.transition_operation($1,'confirmed')",[id]),/garantía/);
  await q("importer","select public.simulate_guarantee($1)",[id]);
  await assert.rejects(q("importer","select public.transition_operation($1,'in_progress')",[id]),/operador/);
  await assert.rejects(q("competitor","select public.transition_operation($1,'in_progress')",[id]),/autorizada/);
  await q("operator","select public.transition_operation($1,'in_progress')",[id]);
  await q("operator","select public.transition_operation($1,'awaiting_delivery_confirmation')",[id]);
  await assert.rejects(q("operator","select public.transition_operation($1,'completed')",[id]),/importador/);
  await q("importer","select public.transition_operation($1,'completed')",[id]);
  await assert.rejects(q("importer","select public.transition_operation($1,'completed')",[id]),/inválida/);
  await assert.rejects(q("admin","update public.operations set phase='created' where id=$1",[id]),/permission denied/);
});
test("cliente mobile anterior rechazado; mobile nuevo solo ofrece acciones de importador",async()=>{
  const f=await offer();const id=(await award(f.id)).rows[0].id;
  await assert.rejects(q("operator","select public.advance_operation($1,'in_transit','Test')",[id]),/incompatible/);
  const screen=await readFile(new URL("../apps/mobile/app/operation/[operationId].tsx",import.meta.url),"utf8");
  assert.equal(screen.includes("nextStep"),false);
  assert.ok(screen.includes('operation.role === "importer"'));
});
test("moneda ARS se conserva en garantía, comisión y movimiento sin usar FOB",async()=>{
  const f=await offer("ARS");const id=(await award(f.id)).rows[0].id;
  let g=(await db.query("select * from public.payment_guarantees where operation_id=$1",[id])).rows[0];
  assert.equal(g.currency,"ARS");assert.equal(Number(g.commission_usd),25);
  await q("importer","select public.simulate_guarantee($1)",[id]);
  await q("operator","select public.transition_operation($1,'in_progress')",[id]);
  await q("operator","select public.transition_operation($1,'awaiting_delivery_confirmation')",[id]);
  await q("importer","select public.transition_operation($1,'completed')",[id]);
  const m=(await db.query("select * from public.wallet_movements where operation_id=$1",[id])).rows[0];
  assert.equal(m.currency,"ARS");assert.equal(Number(m.amount),975);
  await assert.rejects(offer("USD/ARS"),/Moneda|check constraint/);
  await assert.rejects(db.query("update public.payment_guarantees set currency='USD' where operation_id=$1",[id]),/incoherente/);
  assert.equal((await db.query("select count(*)::int n from public.wallet_movements where operation_id=$1",[id])).rows[0].n,1);
});
test("reputación diferencia roles, exige completadas y no inventa historial",async()=>{
  const f=await offer();const id=(await award(f.id)).rows[0].id;
  await assert.rejects(q("importer","insert into public.ratings(operation_id,author_id,recipient_id,score) values($1,$2,$3,5)",[id,users.importer,users.operator]),/row-level/);
  await q("importer","select public.simulate_guarantee($1)",[id]);
  await q("operator","select public.transition_operation($1,'in_progress')",[id]);
  await q("operator","select public.transition_operation($1,'awaiting_delivery_confirmation')",[id]);
  await q("importer","select public.transition_operation($1,'completed')",[id]);
  await q("importer","insert into public.ratings(operation_id,author_id,recipient_id,score) values($1,$2,$3,4)",[id,users.importer,users.operator]);
  await q("operator","insert into public.ratings(operation_id,author_id,recipient_id,score) values($1,$2,$3,3)",[id,users.operator,users.importer]);
  const reputation=async(user,role)=>(await q("importer","select public.public_reputation($1,$2) as r",[user,role])).rows[0].r;
  const importer=await reputation(users.importer,"importer"),operator=await reputation(users.operator,"operator");
  assert.ok(importer.completed>0);assert.ok(importer.count>0);assert.equal(operator.role,"operator");assert.ok(operator.completed>0);
  assert.equal((await reputation(users.operator,"importer")).completed,0);
  assert.equal((await reputation(users.importer,"operator")).completed,0);
  const fresh=await reputation(users.pending,"operator");
  assert.deepEqual(fresh,{role:"operator",average:null,count:0,completed:0,history:"sin historial"});
});
test("Storage y documents rechazan rutas conocidas, metadatos falsos y acceso horizontal",async()=>{
  const path=`${users.operator}/${randomUUID()}.pdf`;
  const payload={id:users.operator,target_type:"operator",document_type:"MSDS",storage_path:path,original_name:"test.pdf",mime_type:"application/pdf",size_bytes:100};
  const id=(await gatewayDocument(db,users.operator,payload)).rows[0].result.id;
  const bound=(await db.query("select * from public.document_objects where document_id=$1",[id])).rows[0];
  assert.equal((await q("operator","select id from storage.objects where id=$1",[bound.object_id])).rows.length,1);
  assert.equal((await q("competitor","select id from storage.objects where id=$1",[bound.object_id])).rows.length,0);
  await assert.rejects(q("competitor","insert into public.documents(operator_id,uploaded_by,kind,storage_path,original_name,mime_type) values($1,$1,'other',$2,'x.pdf','application/pdf')",[users.competitor,bound.storage_path]),/permission denied/);
  await assert.rejects(q("operator","select public.operator_command('document',$1::jsonb)",[JSON.stringify(payload)]),/autorizada/);
  await assert.rejects(q("competitor","select public.register_document_upload($1,$2::jsonb)",[users.operator,JSON.stringify(payload)]),/permission denied/);
  await assert.rejects(q("operator","insert into storage.objects(bucket_id,name,owner_id) values('documents',$1,$2)",[path,users.operator]),/row-level/);
  await assert.rejects(db.query("select public.register_document_upload($1,$2::jsonb)",[users.competitor,JSON.stringify({...payload,id:users.competitor,storage_path:bound.storage_path,sha256:bound.sha256})]),/Archivo/);
  await assert.rejects(gatewayDocument(db,users.operator,{...payload,id:randomUUID(),target_type:"operation"}),/autorizado/);
});
test("SQL y TypeScript comparten exactamente el contrato de estados",async()=>{
  const contract=JSON.parse(await readFile(new URL("../packages/domain/src/operation-contract.json",import.meta.url),"utf8"));
  assert.deepEqual((await db.query("select public.operation_contract() as c")).rows[0].c,contract);
});
test("gateway valida bytes reales: firma, extensión, MIME y tamaño",()=>{
  assert.equal(validateDocumentBytes("test.pdf","application/pdf",Buffer.from("%PDF-1.4")),"pdf");
  assert.throws(()=>validateDocumentBytes("test.pdf","application/pdf",Buffer.from("<html>bad")),/signature/);
  assert.throws(()=>validateDocumentBytes("test.png","image/png",new Uint8Array([137,80,78,71])),/signature/);
  assert.throws(()=>validateDocumentBytes("test.exe","application/pdf",Buffer.from("%PDF-1.4")),/format/);
  assert.throws(()=>validateDocumentBytes("test.pdf","text/html",Buffer.from("%PDF-1.4")),/format/);
  assert.throws(()=>validateDocumentBytes("test.pdf","application/pdf",new Uint8Array(10485761)),/size/);
});
