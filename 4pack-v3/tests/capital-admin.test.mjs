import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
let db;
const q = (actor, sql, args = []) =>
  asUser(db, users[actor] ?? actor, sql, args);
before(async () => {
  db = await createLocalDatabase();
  for (const name of [
    "20261119024020_ars_only_new_contracts.sql",
    "20261119180708_offer_capital_reservations.sql",
    "20261119181203_capital_requests_admin_workbench.sql",
    "20261119221524_capital_profile_consistency.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
});
after(() => db?.close());
async function applicant() {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email)values($1,$2)", [
    id,
    id + "@admin.test",
  ]);
  await db.query("update public.profiles set role='operator' where id=$1", [
    id,
  ]);
  await db.query(
    "insert into public.operator_profiles(user_id,company_name,tax_id)values($1::uuid,'Empresa nueva',$1::text)",
    [id],
  );
  const doc = randomUUID();
  await db.query(
    "insert into public.documents(id,operator_id,uploaded_by,kind,document_type,storage_path,original_name,mime_type,validation_status)values($1,$2,$2,'other','Credencial del operador',$3,'credencial.pdf','application/pdf','approved')",
    [doc, id, id + "/credencial.pdf"],
  );
  return { id, doc };
}
const checklist = { identity: true, company: true, documents: true };
const approve = (id, key = randomUUID()) =>
  q(
    "admin",
    "select public.admin_review_operator($1,'approved',100,'Documentacion revisada',$2::jsonb,$3) id",
    [id, JSON.stringify(checklist), key],
  );
test("postulacion aprobada con capital inicial, reintento idempotente, registrada en Capacidad", async () => {
  const { id } = await applicant(),
    key = randomUUID();
  await approve(id, key);
  await approve(id, key);
  const snapshot = (await q("admin", "select public.admin_workbench() s"))
    .rows[0].s;
  const row = snapshot.operators.find((o) => o.user_id === id);
  assert.equal(row.verification_status, "approved");
  assert.equal(row.capital.approved, 100);
  assert.equal(snapshot.decisions.filter((d) => d.entity_id === id).length, 1);
});
test("ampliacion con evidencia propia: aprobacion por monto menor y nuevo disponible", async () => {
  const { id, doc } = await applicant();
  await approve(id);
  const key = randomUUID(),
    r = (
      await q(
        id,
        "select public.request_capital_increase($1,200,$2::uuid[]) id",
        [key, [doc]],
      )
    ).rows[0].id;
  assert.equal(
    (
      await q(
        id,
        "select public.request_capital_increase($1,200,$2::uuid[]) id",
        [key, [doc]],
      )
    ).rows[0].id,
    r,
  );
  const review = randomUUID();
  await q(
    "admin",
    "select public.admin_review_capital($1,'approved',150,'Respaldo parcial aprobado',$2)",
    [r, review],
  );
  await q(
    "admin",
    "select public.admin_review_capital($1,'approved',150,'Respaldo parcial aprobado',$2)",
    [r, review],
  );
  const s = (await q(id, "select public.operator_capacity_snapshot() s"))
    .rows[0].s;
  assert.equal(s.capital.available, 150);
  assert.equal(s.requests[0].status, "approved");
});
test("evidencia ajena, reemplazada y monto superior son rechazados; correccion informa lo faltante", async () => {
  const a = await applicant(),
    b = await applicant();
  await approve(a.id);
  await assert.rejects(
    q(a.id, "select public.request_capital_increase($1,200,$2::uuid[])", [
      randomUUID(),
      [b.doc],
    ]),
    /documentos vigentes/,
  );
  const r = (
    await q(
      a.id,
      "select public.request_capital_increase($1,200,$2::uuid[]) id",
      [randomUUID(), [a.doc]],
    )
  ).rows[0].id;
  await assert.rejects(
    q(
      "admin",
      "select public.admin_review_capital($1,'approved',250,'Monto demasiado alto',$2)",
      [r, randomUUID()],
    ),
    /invalido/,
  );
  await q(
    "admin",
    "select public.admin_review_capital($1,'correction',null,'Completar respaldo contable',$2)",
    [r, randomUUID()],
  );
  const s = (await q(a.id, "select public.operator_capacity_snapshot() s"))
    .rows[0].s;
  assert.equal(s.requests[0].reason, "Completar respaldo contable");
  assert.equal(s.capital.approved, 100);
});
test("roles, cambios directos, documentos y bandeja administrativa protegidos", async () => {
  for (const actor of ["importer", "operator"]) {
    await assert.rejects(
      q(actor, "select public.admin_workbench()"),
      /administrativo/,
    );
    await assert.rejects(
      q(
        actor,
        "select public.admin_activate_importer($1,'Alta autorizada',$2)",
        [users.importer, randomUUID()],
      ),
      /administrativo/,
    );
  }
  await assert.rejects(
    q(
      "importer",
      "update public.profiles set importer_access_status='pending' where id=auth.uid()",
    ),
    /administrativa/,
  );
  assert.equal(
    (await q("importer", "select * from public.capital_increase_requests")).rows
      .length,
    0,
  );
});
test("reclamo vinculado, asignacion y resolucion auditadas; repetir no duplica mensajes", async () => {
  const id = randomUUID();
  await db.query(
    "insert into public.support_tickets(id,operator_id,operation_id,subject,category)select $1,operator_id,id,'Reclamo de ensayo','Entrega' from public.operations limit 1",
    [id],
  );
  const key = randomUUID();
  await q(
    "admin",
    "select public.admin_manage_claim($1,'in_progress',$2,'Solicitar informacion al operador',$3)",
    [id, users.admin, key],
  );
  await q(
    "admin",
    "select public.admin_manage_claim($1,'in_progress',$2,'Solicitar informacion al operador',$3)",
    [id, users.admin, key],
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.support_messages where ticket_id=$1",
        [id],
      )
    ).rows[0].n,
    1,
  );
  await q(
    "admin",
    "select public.admin_manage_claim($1,'resolved',$2,'Se verifico la evidencia y se resolvio el reclamo',$3)",
    [id, users.admin, randomUUID()],
  );
  assert.equal(
    (
      await db.query("select status from public.support_tickets where id=$1", [
        id,
      ])
    ).rows[0].status,
    "resolved",
  );
});
test("alta individual activa identidad existente sin duplicarla; pendiente no puede publicar", async () => {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email)values($1,$2)", [
    id,
    id + "@importer.test",
  ]);
  const payload = {
    title: "Carga nueva",
    description: "Carga de ensayo",
    origin: "A origen",
    destination: "B destino",
    category: "Otro",
    weight_kg: 1,
    volume_m3: 1,
    fob_usd: 1100,
    preferred_mode: "sea",
  };
  await assert.rejects(
    q(id, "select public.prepare_cargo_publication($1,$2::jsonb)", [
      randomUUID(),
      JSON.stringify(payload),
    ]),
    /pendiente de activacion/,
  );
  await q(
    "admin",
    "select public.admin_activate_importer($1,'Alta individual validada',$2)",
    [id, randomUUID()],
  );
  assert.ok(
    (
      await q(id, "select public.prepare_cargo_publication($1,$2::jsonb) id", [
        randomUUID(),
        JSON.stringify(payload),
      ])
    ).rows[0].id,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.profiles where id=$1",
        [id],
      )
    ).rows[0].n,
    1,
  );
});
