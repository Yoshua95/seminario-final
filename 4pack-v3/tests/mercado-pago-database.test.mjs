import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
import {
  acceptedSandboxUrls,
  rejectedSandboxUrls,
} from "./payment-url-fixture.mjs";
let db, operator;
let historicalReservations;
const sql = await readFile(
  new URL("../supabase/migrations/0024_mercado_pago_test.sql", import.meta.url),
  "utf8",
);
const q = (actor, sql, args = []) =>
  asUser(db, users[actor] ?? actor, sql, args);
before(async () => {
  db = await createLocalDatabase();
  historicalReservations = (
    await db.query(
      "select * from public.operation_capacity_reservations order by operation_id",
    )
  ).rows;
  await db.exec(
    "do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; end $$;",
  );
  if (
    !(await db.query("select to_regclass('public.mp_test_checkouts') name"))
      .rows[0].name
  )
    await db.exec(sql);
  await db.exec(
    await readFile(
      new URL(
        "../supabase/migrations/20261118203109_mp_test_argentina_sandbox_url.sql",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  await db.exec(
    "update public.mp_test_settings set enabled=true where singleton",
  );
  operator = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    operator,
    "mp-operator@test.invalid",
  ]);
  await db.query("update public.profiles set role='operator' where id=$1", [
    operator,
  ]);
  await db.query(
    "insert into public.operator_profiles(user_id,company_name,tax_id,verification_status) values($1,'MP test','DEMO','approved')",
    [operator],
  );
  await q("admin", "select public.configure_operator_capacity($1,$2::jsonb)", [
    operator,
    JSON.stringify({
      currency: "ARS",
      max_operations: "20",
      max_per_operation: "300000",
      max_exposure: "9000000",
      declared_working_capital: "3000000",
      approved_working_capital: "3000000",
      status: "active",
      valid_from: "2020-01-01T00:00:00Z",
      reason: "Ensayo ficticio local MP",
    }),
  ]);
});
after(async () => db?.close());
async function operation(currency = "ARS") {
  const cargo = randomUUID();
  await db.query(
    "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,$2,'MP test','Fixture','A','B','Textiles',10,0.5,1000,'open',now()+interval '1 day')",
    [cargo, users.importer],
  );
  const f = await q(
    operator,
    "select public.quote_command('submit',$1::jsonb) r",
    [
      JSON.stringify({
        cargo_id: cargo,
        quote: quoteFixture({
          currency,
          amount: "250000",
          working_capital_amount: "100000",
        }),
      }),
    ],
  );
  return (
    await q("importer", "select public.award_offer($1) id", [f.rows[0].r.id])
  ).rows[0].id;
}
async function claim(op, actor = users.importer) {
  return (
    await db.query("select public.claim_mp_test_checkout($1,$2) r", [actor, op])
  ).rows[0].r;
}
async function record(op, intent, changes = {}) {
  return db.query("select public.record_mp_test_payment($1,$2,$3::jsonb)", [
    users.importer,
    op,
    JSON.stringify({
      id: "123",
      external_reference: intent.external_reference,
      live_mode: false,
      currency_id: "ARS",
      transaction_amount: 250000,
      status: "approved",
      date_last_updated: "2026-11-18T00:00:00Z",
      ...changes,
    }),
  ]);
}
test("migration preserves historical operation modes and USD reserve", async () => {
  assert.deepEqual(
    (
      await db.query(
        "select * from public.operation_capacity_reservations order by operation_id",
      )
    ).rows,
    historicalReservations,
  );
  const r = await db.query(
    "select count(*)::int n from public.operations where payment_mode<>'legacy_simulated'",
  );
  assert.equal(r.rows[0].n, 0);
});
test("amount and reference come from accepted offer; repeated claims do not duplicate", async () => {
  const op = await operation(),
    a = await claim(op),
    b = await claim(op);
  assert.equal(Number(a.amount), 250000);
  assert.equal(a.currency, "ARS");
  assert.equal(a.external_reference, b.external_reference);
  assert.equal(a.claimed, true);
  assert.equal(b.claimed, false);
  await assert.rejects(claim(op, users.competitor), /autorizada/);
});
test("client cannot record payment, write ledger or bypass by simulating guarantee", async () => {
  const op = await operation();
  await assert.rejects(
    q("importer", "select public.claim_mp_test_checkout($1,$2)", [
      users.importer,
      op,
    ]),
    /permission denied/,
  );
  await assert.rejects(
    q(
      "importer",
      "insert into public.mp_test_checkouts(operation_id,amount,currency) values($1,1,'ARS')",
      [op],
    ),
    /permission denied/,
  );
  await assert.rejects(
    q("importer", "select public.simulate_guarantee($1)", [op]),
    /checkout/,
  );
});
test("invalid, live, foreign or altered amounts cannot confirm guarantee", async () => {
  const op = await operation(),
    i = await claim(op);
  for (const change of [
    { live_mode: true },
    { transaction_amount: 1 },
    { currency_id: "USD" },
    { external_reference: "other" },
    { external_reference: null },
  ])
    await assert.rejects(record(op, i, change), /incompatible/);
  assert.equal(
    (await db.query("select phase from public.operations where id=$1", [op]))
      .rows[0].phase,
    "created",
  );
});
test("rejected then approved persists with one guarantee, one payment per ID and monotonic timestamps", async () => {
  const op = await operation(),
    i = await claim(op);
  await record(op, i, { id: "987", status: "rejected" });
  assert.equal(
    (await db.query("select phase from public.operations where id=$1", [op]))
      .rows[0].phase,
    "created",
  );
  await record(op, i, { id: "987", date_last_updated: "2026-11-18T00:01:00Z" });
  await record(op, i, { id: "987", date_last_updated: "2026-11-18T00:01:00Z" });
  await record(op, i, {
    id: "987",
    status: "rejected",
    date_last_updated: "2026-11-18T00:00:00Z",
  });
  assert.equal(
    (await db.query("select phase from public.operations where id=$1", [op]))
      .rows[0].phase,
    "confirmed",
  );
  assert.equal(
    (
      await db.query(
        "select status from public.mp_test_checkouts where operation_id=$1",
        [op],
      )
    ).rows[0].status,
    "approved",
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.mp_test_payments where operation_id=$1",
        [op],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.payment_guarantees where operation_id=$1",
        [op],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await q(
        "competitor",
        "select * from public.mp_test_checkouts where operation_id=$1",
        [op],
      )
    ).rows.length,
    0,
  );
});
test("cannot change payment mode or directly confirm the guarantee", async () => {
  const op = await operation();
  await assert.rejects(
    db.query(
      "update public.operations set payment_mode='legacy_simulated' where id=$1",
      [op],
    ),
    /inmutable/,
  );
  await assert.rejects(
    db.query(
      "update public.payment_guarantees set status='held_simulated' where operation_id=$1",
      [op],
    ),
    /proveedor/,
  );
  await assert.rejects(
    q("importer", "select public.record_mp_test_payment($1,$2,'{}')", [
      users.importer,
      op,
    ]),
    /permission denied/,
  );
});
test("new USD operation retains the legacy guarantee flow", async () => {
  await q("admin", "select public.configure_operator_capacity($1,$2::jsonb)", [
    operator,
    JSON.stringify({
      currency: "USD",
      max_operations: "20",
      max_per_operation: "300000",
      max_exposure: "9000000",
      declared_working_capital: "3000000",
      approved_working_capital: "3000000",
      status: "active",
      valid_from: "2020-01-01T00:00:00Z",
      reason: "Fixture historica USD local",
    }),
  ]);
  const op = await operation("USD");
  assert.equal(
    (
      await db.query("select payment_mode from public.operations where id=$1", [
        op,
      ])
    ).rows[0].payment_mode,
    "legacy_simulated",
  );
  await assert.rejects(claim(op), /fuera del ensayo/);
  await q("importer", "select public.simulate_guarantee($1)", [op]);
  assert.equal(
    (await db.query("select phase from public.operations where id=$1", [op]))
      .rows[0].phase,
    "confirmed",
  );
});
test("verified ledger survives database closure and reload", async () => {
  const op = await operation(),
    i = await claim(op);
  await record(op, i, { id: "999", status: "rejected" });
  const dump = await db.dumpDataDir();
  await db.close();
  db = new PGlite({ loadDataDir: dump });
  await db.waitReady;
  assert.equal(
    (
      await q(
        "importer",
        "select status from public.mp_test_checkouts where operation_id=$1",
        [op],
      )
    ).rows[0].status,
    "rejected",
  );
  await record(op, i, {
    id: "999",
    status: "approved",
    date_last_updated: "2026-11-18T00:02:00Z",
  });
  assert.equal(
    (
      await q(
        "importer",
        "select status from public.mp_test_checkouts where operation_id=$1",
        [op],
      )
    ).rows[0].status,
    "approved",
  );
});

test("new storage URL migration rejects deceptive URLs and recovers existing claim idempotently", async () => {
  for (const good of acceptedSandboxUrls) {
    const op = await operation();
    await claim(op);
    for (const bad of rejectedSandboxUrls)
      await assert.rejects(
        db.query("select public.save_mp_test_preference($1,$2,$3,$4)", [
          users.importer,
          op,
          "fixture-" + op,
          bad,
        ]),
        /Checkout de prueba invalido/,
      );
    await assert.rejects(
      q("operator", "select public.save_mp_test_preference($1,$2,$3,$4)", [
        users.importer,
        op,
        "fixture-" + op,
        good,
      ]),
      /permission denied/,
    );
    for (let i = 0; i < 2; i++)
      await db.query("select public.save_mp_test_preference($1,$2,$3,$4)", [
        users.importer,
        op,
        "fixture-" + op,
        good,
      ]);
    const row = (
      await db.query(
        "select preference_id,preference_state from public.mp_test_checkouts where operation_id=$1",
        [op],
      )
    ).rows[0];
    assert.deepEqual(row, {
      preference_id: "fixture-" + op,
      preference_state: "ready",
    });
  }
});
