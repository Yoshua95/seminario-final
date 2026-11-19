import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
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
async function fixture() {
  const id = randomUUID(),
    c = randomUUID();
  await db.query("insert into auth.users(id,email)values($1,$2)", [
    id,
    id + "@profile.test",
  ]);
  await db.query("update public.profiles set role='operator' where id=$1", [
    id,
  ]);
  await db.query(
    "insert into public.operator_profiles(user_id,company_name,tax_id,verification_status)values($1::uuid,'Empresa test',$1::text,'approved')",
    [id],
  );
  await q(
    "admin",
    "select public.set_approved_capital($1,100,'Capital ficticio de ensayo')",
    [id],
  );
  await db.query(
    "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)values($1,$2,'Carga test','Textiles de ensayo','China','Argentina','Otro',1,1,1100,'open',now()+interval '2 days')",
    [c, users.importer],
  );
  const f = (
    await q(id, "select public.quote_command('submit',$1::jsonb) r", [
      JSON.stringify({
        cargo_id: c,
        quote: quoteFixture({
          currency: "ARS",
          amount: "250000",
          working_capital_amount: "60",
        }),
      }),
    ])
  ).rows[0].r.id;
  return { id, c, f };
}
test("misma fuente: capital y valor contractual distintos; transferencia no duplica", async () => {
  const { id, f } = await fixture();
  let cap = (await q(id, "select public.operator_capacity_snapshot() s"))
    .rows[0].s.capital;
  assert.equal(cap.available, 40);
  assert.equal(cap.offers, 60);
  await q("importer", "select public.award_offer($1)", [f]);
  cap = (await q(id, "select public.operator_capacity_snapshot() s")).rows[0].s
    .capital;
  assert.equal(cap.operations, 60);
  assert.equal(cap.offers, 0);
  assert.equal(cap.available, 40);
  assert.equal(cap.contract_value, 250000);
  assert.equal(cap.inconsistent, false);
});
test("inconsistencia bloquea incluso compromisos cero y el ajuste protege reservas", async () => {
  const { id, c } = await fixture();
  await assert.rejects(
    q(
      "admin",
      "select public.set_approved_capital($1,50,'Ajuste inferior al comprometido')",
      [id],
    ),
    /comprometido/,
  );
  await db.query(
    "update public.operator_capacity_currency_limits set approved_working_capital=25 where operator_id=$1 and currency='ARS'",
    [id],
  );
  const cap = (await q(id, "select public.operator_capacity_snapshot() s"))
    .rows[0].s.capital;
  assert.equal(cap.inconsistent, true);
  assert.equal(cap.available, -35);
  const other = randomUUID();
  await db.query(
    "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)select $1,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline from public.cargo_requests where id=$2",
    [other, c],
  );
  await assert.rejects(
    q(id, "select public.quote_command('submit',$1::jsonb)", [
      JSON.stringify({
        cargo_id: other,
        quote: quoteFixture({ currency: "ARS", working_capital_amount: "0" }),
      }),
    ]),
    /faltan ARS 35/,
  );
});
test("un suspendido no puede ser reactivado como postulacion", async () => {
  await assert.rejects(
    q(
      "admin",
      "select public.admin_review_operator($1,'approved',100,'Reactivacion indebida','{\"identity\":true,\"company\":true,\"documents\":true}',$2)",
      [users.suspended, randomUUID()],
    ),
    /suspendida/,
  );
});
