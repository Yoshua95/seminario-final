import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
let db;
const q = (actor, sql, params = []) =>
  asUser(db, users[actor] ?? actor, sql, params);
const defaults = {
  currency: "USD",
  max_operations: "5",
  max_weight_kg: "",
  max_volume_m3: "",
  max_per_operation: "1000",
  max_exposure: "4000",
  declared_working_capital: "2000",
  approved_working_capital: "2000",
  status: "active",
  valid_from: "2020-01-01T00:00:00Z",
  reason: "Evaluacion ficticia de prueba",
};
const config = (actor, id, changes = {}) =>
  q(actor, "select public.configure_operator_capacity($1,$2::jsonb)", [
    id,
    JSON.stringify({ ...defaults, ...changes }),
  ]);
const snapshot = async (id, actor = id) =>
  (await q(actor, "select public.operator_capacity_snapshot($1) s", [id]))
    .rows[0].s;
async function operator(changes = {}) {
  const id = randomUUID();
  await db.query("insert into auth.users(id,email) values($1,$2)", [
    id,
    `${id}@capacity.test`,
  ]);
  await db.query("update public.profiles set role='operator' where id=$1", [
    id,
  ]);
  await db.query(
    "insert into public.operator_profiles(user_id,company_name,tax_id,verification_status) values($1,'Capacity Test',$2,'approved')",
    [id, id],
  );
  if (changes !== null) await config("admin", id, changes);
  return id;
}
async function offer(id, changes = {}, cargoChanges = {}) {
  const c = randomUUID();
  await db.query(
    "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,$2,'Capacity cargo','Test','A','B','Test',$3,$4,$5,'open',now()+interval '1 day')",
    [
      c,
      users.importer,
      cargoChanges.weight ?? 1,
      cargoChanges.volume ?? 1,
      cargoChanges.fob ?? 999999,
    ],
  );
  const result = await q(
    id,
    "select public.quote_command('submit',$1::jsonb) r",
    [
      JSON.stringify({
        cargo_id: c,
        quote: quoteFixture({ working_capital_amount: "200", ...changes }),
      }),
    ],
  );
  return { id: result.rows[0].r.id, cargo: c };
}
const award = async (f) =>
  (await q("importer", "select public.award_offer($1) id", [f.id])).rows[0].id;
const transition = (actor, id, phase) =>
  q(actor, "select public.transition_operation($1,$2,$3)", [
    id,
    phase,
    "Motivo contractual de prueba",
  ]);
async function started(id) {
  await q("importer", "select public.simulate_guarantee($1)", [id]);
  await transition(
    (
      await db.query("select operator_id from public.operations where id=$1", [
        id,
      ])
    ).rows[0].operator_id,
    id,
    "in_progress",
  );
}
before(async () => {
  db = await createLocalDatabase();
});
after(async () => {
  await db?.close();
});

test("sin limites aprobados: rechazo generico y rollback de operacion, garantia y reserva", async () => {
  const id = await operator(null),
    f = await offer(id);
  await assert.rejects(
    award(f),
    /El operador no dispone actualmente de capacidad suficiente/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.operations where cargo_id=$1",
        [f.cargo],
      )
    ).rows[0].n,
    0,
  );
  assert.equal((await snapshot(id)).reservations.length, 0);
  assert.equal(
    (await db.query("select status from public.offers where id=$1", [f.id]))
      .rows[0].status,
    "submitted",
  );
  assert.equal(
    (
      await db.query("select status from public.cargo_requests where id=$1", [
        f.cargo,
      ])
    ).rows[0].status,
    "open",
  );
});
for (const [name, limits, quote, cargo] of [
  ["precio por operacion", { max_per_operation: "999" }, {}, {}],
  ["exposicion", { max_exposure: "999" }, {}, {}],
  ["cantidad", { max_operations: "0" }, {}, {}],
  ["peso", { max_weight_kg: "0.5" }, {}, {}],
  ["volumen", { max_volume_m3: "0.5" }, {}, {}],
  ["capital de trabajo", { approved_working_capital: "199" }, {}, {}],
  ["vigencia vencida", { valid_until: "2021-01-01T00:00:00Z" }, {}, {}],
  ["vigencia futura", { valid_from: "2099-01-01T00:00:00Z" }, {}, {}],
  ["inactividad", { status: "inactive" }, {}, {}],
])
  test(`dimension independiente: ${name}`, async () => {
    const id = await operator(limits),
      f = await offer(id, quote, cargo);
    const before = (
      await db.query("select count(*)::int n from public.payment_guarantees")
    ).rows[0].n;
    await assert.rejects(award(f), /capacidad suficiente/);
    assert.equal(
      (await db.query("select count(*)::int n from public.payment_guarantees"))
        .rows[0].n,
      before,
    );
    assert.equal((await snapshot(id)).usage.operations, 0);
  });

test("FOB no consume; null peso y volumen significa sin limite; cero capital explicito valido", async () => {
  const id = await operator({ approved_working_capital: "0" });
  await award(
    await offer(
      id,
      { working_capital_amount: "0" },
      { weight: 10000, volume: 9000, fob: 99999999 },
    ),
  );
  const s = await snapshot(id);
  assert.equal(s.limits.max_weight_kg, null);
  assert.equal(s.usage.weight_kg, 10000);
  assert.equal(s.usage.currencies.USD.exposure, 1000);
  assert.equal(s.usage.currencies.USD.working_capital, 0);
});

test("acumulacion, idempotencia y adjudicaciones encoladas no duplican ni exceden", async () => {
  const id = await operator({ max_exposure: "2000", max_operations: "2" });
  const a = await offer(id),
    b = await offer(id),
    c = await offer(id);
  const op = await award(a);
  assert.equal(await award(a), op);
  const results = await Promise.allSettled([award(b), award(c)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const s = await snapshot(id);
  assert.equal(s.usage.operations, 2);
  assert.equal(s.usage.currencies.USD.exposure, 2000);
  assert.equal(s.usage.currencies.USD.working_capital, 400);
  assert.equal(s.reservations.length, 2);
  assert.equal(s.events.filter((e) => e.action === "reserved").length, 2);
  assert.ok(
    (
      await db.query(
        "select revision from public.operator_capacity_mutex where operator_id=$1",
        [id],
      )
    ).rows[0].revision > 0,
  );
  await assert.rejects(
    db.query(
      "insert into public.operation_capacity_reservations select * from public.operation_capacity_reservations where operation_id=$1",
      [op],
    ),
    /duplicate key/,
  );
});

test("USD y ARS separados; cantidad global compartida", async () => {
  const id = await operator({ max_exposure: "1000", max_operations: "2" });
  await assert.rejects(
    award(await offer(id, { currency: "ARS" })),
    /capacidad suficiente/,
  );
  await config("admin", id, {
    currency: "ARS",
    max_exposure: "3000",
    max_operations: "2",
  });
  await award(await offer(id));
  await award(await offer(id, { currency: "ARS" }));
  const s = await snapshot(id);
  assert.equal(s.usage.currencies.USD.exposure, 1000);
  assert.equal(s.usage.currencies.ARS.exposure, 1000);
  assert.equal(s.usage.operations, 2);
  await assert.rejects(
    award(await offer(id, { currency: "ARS" })),
    /capacidad suficiente/,
  );
});

for (const [name, limits] of [
  ["capital acumulado", { approved_working_capital: "300" }],
  ["peso acumulado", { max_weight_kg: "1.5" }],
  ["volumen acumulado", { max_volume_m3: "1.5" }],
  ["exposicion acumulada", { max_exposure: "1500" }],
])
  test(`${name} impide segunda operacion independientemente`, async () => {
    const id = await operator(limits);
    await award(await offer(id));
    await assert.rejects(award(await offer(id)), /capacidad suficiente/);
    assert.equal((await snapshot(id)).usage.operations, 1);
  });

test("desactivacion de moneda independiente de vigencia operativa global", async () => {
  const id = await operator();
  await config("admin", id, {
    currency: "ARS",
    status: "inactive",
    operational_status: "active",
  });
  await award(await offer(id));
  await assert.rejects(
    award(await offer(id, { currency: "ARS" })),
    /capacidad suficiente/,
  );
  assert.equal((await snapshot(id)).limits.status, "active");
});

test("capital presentado se reemplaza con revision sin alterar el original", async () => {
  const id = await operator(),
    first = await offer(id);
  await q(id, "select public.quote_command('withdraw',$1::jsonb)", [
    JSON.stringify({ offer_id: first.id }),
  ]);
  const second = (
    await q(id, "select public.quote_command('submit',$1::jsonb) r", [
      JSON.stringify({
        cargo_id: first.cargo,
        replaces_offer_id: first.id,
        quote: quoteFixture({ working_capital_amount: "350" }),
      }),
    ])
  ).rows[0].r.id;
  const rows = (
    await q(
      id,
      "select revision,normalized_quote from public.offers where cargo_id=$1 order by revision",
      [first.cargo],
    )
  ).rows;
  assert.equal(rows[0].normalized_quote.working_capital_amount, "200");
  assert.equal(rows[1].normalized_quote.working_capital_amount, "350");
  assert.equal(rows[1].revision, 2);
  const op = await award({ id: second });
  assert.equal(
    (await snapshot(id)).reservations.find((r) => r.operation_id === op)
      .working_capital_required,
    350,
  );
});

test("RLS y RPC: solo propietario y admin; mutaciones directas e internas denegadas", async () => {
  const id = await operator();
  assert.ok((await snapshot(id)).limits);
  assert.ok((await snapshot(id, "admin")).limits);
  for (const actor of ["importer", "competitor"]) {
    await assert.rejects(snapshot(id, actor), /no autorizado/);
    for (const table of [
      "operator_capacity_limits",
      "operator_capacity_currency_limits",
      "operation_capacity_reservations",
      "capacity_events",
      "capacity_terminal_decisions",
    ])
      assert.equal(
        (
          await q(actor, `select * from public.${table} where operator_id=$1`, [
            id,
          ])
        ).rows.length,
        0,
      );
  }
  await assert.rejects(config(id, id), /administrativo/);
  await assert.rejects(config("admin", users.importer), /no es operador/);
  await assert.rejects(
    q(
      id,
      "update public.operator_capacity_limits set max_operations=999 where operator_id=$1",
      [id],
    ),
    /permission denied/,
  );
  await assert.rejects(
    q(id, "select public.capacity_usage($1)", [id]),
    /permission denied/,
  );
  await assert.rejects(
    q(id, "select public.lock_operator_capacity($1)", [id]),
    /permission denied/,
  );
  await assert.rejects(
    q("importer", "select public.award_offer_before_capacity($1)", [
      randomUUID(),
    ]),
    /permission denied/,
  );
  const raw = JSON.stringify(
    (await q("importer", "select public.commercial_directory() p")).rows,
  );
  for (const key of [
    "approved_working_capital",
    "max_exposure",
    "capacity_events",
  ])
    assert.equal(raw.includes(key), false);
});

test("pendiente y suspendido no reservan; suspension preserva reservas y consulta propia", async () => {
  const id = await operator(),
    existing = await award(await offer(id)),
    next = await offer(id);
  for (const status of ["pending", "suspended"]) {
    await db.query(
      "update public.operator_profiles set verification_status=$2 where user_id=$1",
      [id, status],
    );
    await assert.rejects(award(next), /operador|aprobado|suspendido/i);
    assert.equal((await snapshot(id)).reservations[0].operation_id, existing);
    assert.equal((await snapshot(id)).usage.operations, 1);
  }
});

test("completed activa y libera una vez; retry devuelve reserva existente", async () => {
  const id = await operator(),
    f = await offer(id),
    op = await award(f);
  assert.equal((await snapshot(id)).reservations[0].state, "reserved");
  await started(op);
  assert.equal((await snapshot(id)).reservations[0].state, "active");
  await transition(id, op, "awaiting_delivery_confirmation");
  await transition("importer", op, "completed");
  const s = await snapshot(id);
  assert.equal(s.usage.operations, 0);
  assert.equal(s.reservations[0].state, "released");
  assert.ok(s.reservations[0].released_at);
  for (let i = 0; i < 2; i++)
    assert.equal(
      (
        await q("admin", "select public.admin_release_capacity($1,$2) id", [
          op,
          "Reintento de liberacion",
        ])
      ).rows[0].id,
      op,
    );
  assert.equal(
    (await snapshot(id)).events.filter((e) => e.action === "released").length,
    1,
  );
  assert.equal(await award(f), op);
  assert.equal((await snapshot(id)).usage.operations, 0);
});

test("disputed conserva capacidad y no admite liberacion administrativa", async () => {
  const id = await operator(),
    op = await award(await offer(id));
  await started(op);
  await transition("importer", op, "disputed");
  await assert.rejects(
    q("admin", "select public.admin_release_capacity($1,$2)", [
      op,
      "Intento no autorizado",
    ]),
    /ocupando capacidad/,
  );
  assert.equal((await snapshot(id)).usage.operations, 1);
});

test("cancelled registra consecuencias antes de liberar; cierre idempotente", async () => {
  const id = await operator(),
    op = await award(await offer(id));
  await assert.rejects(
    transition("importer", op, "cancelled"),
    /consecuencias/,
  );
  await assert.rejects(
    q(
      "importer",
      "select public.admin_capacity_terminal_transition($1,'cancelled','Motivo claro','Sin fondos cobrados')",
      [op],
    ),
    /administrativo/,
  );
  for (let i = 0; i < 2; i++)
    await q(
      "admin",
      "select public.admin_capacity_terminal_transition($1,'cancelled','Acuerdo de cancelacion','Sin fondos cobrados; sin reembolso ejecutado')",
      [op],
    );
  assert.equal((await snapshot(id)).usage.operations, 0);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.capacity_terminal_decisions where operation_id=$1",
        [op],
      )
    ).rows[0].n,
    1,
  );
});

test("failed solo desde incident, retencion simulada registrada sin reembolso", async () => {
  const id = await operator(),
    op = await award(await offer(id));
  await assert.rejects(
    q(
      "admin",
      "select public.admin_capacity_terminal_transition($1,'failed','Fallo documentado','Revisar obligacion contractual')",
      [op],
    ),
    /inválida/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.capacity_terminal_decisions where operation_id=$1",
        [op],
      )
    ).rows[0].n,
    0,
  );
  await started(op);
  await transition("importer", op, "incident");
  await q(
    "admin",
    "select public.admin_capacity_terminal_transition($1,'failed','Fallo documentado','Retencion simulada pendiente de revision administrativa')",
    [op],
  );
  assert.equal((await snapshot(id)).usage.operations, 0);
  const d = (
    await db.query(
      "select consequences from public.capacity_terminal_decisions where operation_id=$1",
      [op],
    )
  ).rows[0].consequences;
  assert.equal(d.disposition, "simulated_hold_pending_admin_review");
  assert.equal(
    (
      await db.query(
        "select status from public.payment_guarantees where operation_id=$1",
        [op],
      )
    ).rows[0].status,
    "held_simulated",
  );
});

test("reduccion bajo consumo rechazada; cambio con motivo auditado y desactivacion preserva", async () => {
  const id = await operator();
  await award(await offer(id));
  for (const changes of [
    { max_operations: "0" },
    { max_exposure: "999" },
    { max_per_operation: "999" },
    { approved_working_capital: "199" },
    { max_weight_kg: "0" },
    { max_volume_m3: "0" },
  ])
    await assert.rejects(config("admin", id, changes), /consumo activo/);
  await assert.rejects(config("admin", id, { reason: "" }), /motivo/);
  await config("admin", id, {
    status: "inactive",
    reason: "Revision economica temporal",
  });
  const s = await snapshot(id);
  assert.equal(s.usage.operations, 1);
  assert.equal(s.limits.status, "inactive");
  assert.ok(s.events.some((e) => e.reason === "Revision economica temporal"));
  await assert.rejects(award(await offer(id)), /capacidad suficiente/);
});

test("capital: moneda, signo, exceso, dato faltante; borrador versionado y snapshot", async () => {
  const id = await operator();
  for (const changes of [
    { working_capital_amount: "-1" },
    { working_capital_amount: "1001" },
    { working_capital_currency: "ARS" },
    { working_capital_amount: undefined },
  ])
    await assert.rejects(offer(id, changes));
  const f = await offer(id),
    op = await award(f);
  const snap = (
    await db.query(
      "select content from public.operation_contract_snapshots where operation_id=$1",
      [op],
    )
  ).rows[0].content;
  assert.equal(snap.quote.working_capital_amount, "200");
  assert.equal(snap.quote.working_capital_currency, "USD");
  await assert.rejects(
    q(
      id,
      'update public.offers set normalized_quote=normalized_quote||\'{"working_capital_amount":"0"}\' where id=$1',
      [f.id],
    ),
    /permission denied/,
  );
  const c = (await offer(id)).cargo;
  await q(id, "select public.quote_command('withdraw',$1::jsonb)", [
    JSON.stringify({
      offer_id: (
        await db.query("select id from public.offers where cargo_id=$1", [c])
      ).rows[0].id,
    }),
  ]);
  const draft = (
    await q(id, "select public.quote_command('save',$1::jsonb) r", [
      JSON.stringify({
        cargo_id: c,
        quote: {
          working_capital_amount: "150",
          working_capital_currency: "USD",
        },
      }),
    ])
  ).rows[0].r.id;
  await q(id, "select public.quote_command('save',$1::jsonb)", [
    JSON.stringify({
      draft_id: draft,
      quote: { working_capital_amount: "175", working_capital_currency: "USD" },
    }),
  ]);
  assert.equal(
    (
      await q(id, "select content from public.quote_drafts where id=$1", [
        draft,
      ])
    ).rows[0].content.working_capital_amount,
    "175",
  );
});

test("upgrade 0019 con datos: no inventa limites ni capital; revision explicita obligatoria", async () => {
  const old = new PGlite();
  await old.waitReady;
  try {
    await old.exec(
      await readFile(
        new URL("../supabase/demo/bootstrap.sql", import.meta.url),
        "utf8",
      ),
    );
    const files = (
      await readdir(new URL("../supabase/migrations/", import.meta.url))
    )
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const f of files.filter((f) => f < "0020"))
      await old.exec(
        (
          await readFile(
            new URL("../supabase/migrations/" + f, import.meta.url),
            "utf8",
          )
        ).replace(/create extension if not exists "pgcrypto";/i, ""),
      );
    await old.exec(
      await readFile(
        new URL("../supabase/demo/operator-seed.sql", import.meta.url),
        "utf8",
      ),
    );
    for (const f of files.filter((f) => f >= "0020"))
      await old.exec(
        await readFile(
          new URL("../supabase/migrations/" + f, import.meta.url),
          "utf8",
        ),
      );
    assert.equal(
      (
        await old.query(
          "select count(*)::int n from public.operator_capacity_limits",
        )
      ).rows[0].n,
      0,
    );
    const r = (
      await old.query("select * from public.operation_capacity_reservations")
    ).rows;
    assert.equal(r.length, 1);
    assert.equal(r[0].state, "requires_review");
    assert.equal(r[0].working_capital_required, null);
    await assert.rejects(
      asUser(
        old,
        users.admin,
        "select public.configure_operator_capacity($1,$2::jsonb)",
        [users.operator, JSON.stringify(defaults)],
      ),
      /históricas/,
    );
    await asUser(
      old,
      users.admin,
      "select public.review_historical_capacity($1,300,$2)",
      [r[0].operation_id, "Evaluacion historica documentada"],
    );
    assert.equal(
      (
        await old.query(
          "select working_capital_required from public.operation_capacity_reservations",
        )
      ).rows[0].working_capital_required,
      "300.00",
    );
    assert.equal(
      (
        await old.query(
          "select count(*)::int n from public.offers where normalized_quote is not null",
        )
      ).rows[0].n,
      0,
    );
  } finally {
    await old.close();
  }
});
