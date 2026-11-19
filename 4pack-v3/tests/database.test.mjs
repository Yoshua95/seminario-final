import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { gatewayDocument } from "./document-gateway-helper.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
import {
  createLocalDatabase,
  asUser,
  demoUsers,
} from "../scripts/local-database.mjs";
let db;
const cargo = "b0000000-0000-0000-0000-000000009477",
  operation = "d0000000-0000-0000-0000-000000006291";
const query = (user, sql, params = []) =>
  asUser(db, demoUsers[user], sql, params);
const command = (user, name, payload) =>
  name === "document" ? gatewayDocument(db, demoUsers[user], payload) : query(user, "select public.operator_command($1,$2::jsonb) as result", [
    name,
    JSON.stringify(name === "offer" ? {...payload,quote:quoteFixture({mode:payload.mode,amount:String(payload.amount),estimated_days:String(payload.days),scope:payload.terms || "Servicio de prueba",currency:payload.currency??"USD"})} : payload),
  ]);
before(async () => {
  db = await createLocalDatabase();
});
after(async () => {
  await db?.close();
});
test("migraciones aditivas idempotentes", async () => {
  // Test historical replay BEFORE applying later migrations, as a real upgrade does.
  // Replaying 0011 after 0015 would deliberately reinstall obsolete document RPCs.
  const historical = new PGlite();
  await historical.waitReady;
  await historical.exec(await readFile(new URL("../supabase/demo/bootstrap.sql", import.meta.url), "utf8"));
  const files = (await readdir(new URL("../supabase/migrations/", import.meta.url))).filter(f=>f.endsWith(".sql")).sort();
  for (const file of files.filter(f=>f<"0015"))
    await historical.exec((await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8")).replace(/create extension if not exists "pgcrypto";/i,""));
  for (const file of (
    await readdir(new URL("../supabase/migrations/", import.meta.url))
  )
    .filter((f) => /^00(09|10|11|12|13|14)_/.test(f))
    .sort())
    await historical.exec(
      await readFile(
        new URL("../supabase/migrations/" + file, import.meta.url),
        "utf8",
      ),
    );
  const legacySeed = (await readFile(new URL("../supabase/demo/operator-seed.sql",import.meta.url),"utf8")).replace("'customs','in_progress'","'customs','customs'");
  await historical.exec(legacySeed);
  for (const file of files.filter(f=>f>="0015"))
    await historical.exec(await readFile(new URL("../supabase/migrations/"+file,import.meta.url),"utf8"));
  assert.ok((await historical.query("select public.operation_contract() as c")).rows[0].c.created);
  assert.equal((await historical.query("select phase from public.operations where status='customs'")).rows[0].phase,"in_progress");
  await historical.close();
});
test("RLS oculta ofertas competidoras y contactos previos", async () => {
  const offers = await query(
    "operator",
    "select * from public.offers where cargo_id=$1",
    [cargo],
  );
  assert.equal(offers.rows.length, 0);
  const p = await query(
    "competitor",
    "select * from public.profiles where id=$1",
    [demoUsers.importer],
  );
  assert.equal(p.rows.length, 0);
});
test("pendiente y suspendido no acceden a oportunidades ni operaciones", async () => {
  for (const u of ["pending", "suspended"]) {
    assert.equal(
      (await query(u, "select * from public.cargo_requests")).rows.length,
      0,
    );
    await assert.rejects(
      command(u, "offer", {
        id: cargo,
        mode: "air",
        amount: 1200,
        days: 8,
        terms: "Servicio",
      }),
      /no está aprobado/,
    );
  }
});
test("operador no cambia rol, aprobación, reputación ni saldos", async () => {
  await assert.rejects(
    query("operator", "update public.profiles set role='admin' where id=$1", [
      demoUsers.operator,
    ]),
    /rol/,
  );
  await assert.rejects(
    query(
      "pending",
      "update public.operator_profiles set verification_status='approved' where user_id=$1",
      [demoUsers.pending],
    ),
  );
  await assert.rejects(
    query(
      "operator",
      "update public.operator_profiles set rating=1 where user_id=$1",
      [demoUsers.operator],
    ),
  );
  await assert.rejects(
    query(
      "operator",
      "insert into public.wallet_movements(operator_id,kind,amount,description,event_key) values($1,'release',100,'fraude','fraude')",
      [demoUsers.operator],
    ),
  );
});
test("oferta ciega persiste y no admite duplicado entre modalidades", async () => {
  await command("operator", "offer", {
    id: cargo,
    mode: "air",
    amount: 1200,
    days: 8,
    terms: "Flete seguro",
    documentation: "MSDS",
  });
  assert.equal(
    (
      await query("operator", "select * from public.offers where cargo_id=$1", [
        cargo,
      ])
    ).rows.length,
    1,
  );
  await assert.rejects(
    command("operator", "offer", {
      id: cargo,
      mode: "sea",
      amount: 900,
      days: 30,
      terms: "Otra",
    }),
    /oferta activa/,
  );
  assert.equal(
    (
      await query(
        "competitor",
        "select * from public.offers where cargo_id=$1",
        [cargo],
      )
    ).rows.length,
    1,
  );
});
test("oferta sellada no permite alterar el precio", async () => {
  await assert.rejects(query(
    "operator",
    "update public.offers set freight_usd=1 where cargo_id=$1 returning id",
    [cargo],
  ), /permission denied/);
});
test("licitación cerrada y tarifa inválida son rechazadas", async () => {
  await assert.rejects(
    command("operator", "offer", {
      id: operation.replace("d", "b"),
      mode: "air",
      amount: 1200,
      days: 8,
      terms: "Servicio",
    }),
    /cerrada/,
  );
  await assert.rejects(
    command("operator", "offer", {
      id: "b0000000-0000-0000-0000-000000008211",
      mode: "air",
      amount: -1,
      days: 8,
      terms: "Servicio",
    }),
  );
});
test("adjudicación del importador crea operación y garantía", async () => {
  const f = await query(
    "operator",
    "select id from public.offers where cargo_id=$1",
    [cargo],
  );
  const r = await query("importer", "select public.award_offer($1) as id", [
    f.rows[0].id,
  ]);
  assert.ok(r.rows[0].id);
  assert.equal(
    (
      await query(
        "operator",
        "select * from public.operations where cargo_id=$1",
        [cargo],
      )
    ).rows.length,
    1,
  );
  await query("importer", "select public.simulate_guarantee($1)", [
    r.rows[0].id,
  ]);
  assert.equal(
    (
      await query(
        "operator",
        "select phase from public.operations where id=$1",
        [r.rows[0].id],
      )
    ).rows[0].phase,
    "confirmed",
  );
});
test("operaciones ajenas y saltos de etapa están bloqueados", async () => {
  await assert.rejects(
    command("competitor", "milestone", {
      id: operation,
      event_type: "Incidencia",
      description: "Consulta",
      occurred_at: new Date().toISOString(),
    }),
    /no pertenece/,
  );
  await assert.rejects(
    command("operator", "advance", { id: operation, phase: "completed" }),
    /inválida/,
  );
});
test("hitos y mensajes persisten; mensajes vacíos bloqueados", async () => {
  await command("operator", "milestone", {
    id: operation,
    event_type: "Documentación validada",
    description: "Manifiesto verificado",
    location: "Ezeiza",
    occurred_at: new Date().toISOString(),
  });
  await command("operator", "message", {
    id: operation,
    body: "Mensaje persistente",
  });
  assert.ok(
    (
      await query(
        "operator",
        "select * from public.messages where body='Mensaje persistente'",
      )
    ).rows.length,
  );
  await assert.rejects(
    command("operator", "message", { id: operation, body: " " }),
  );
  await assert.rejects(
    query("competitor", "select public.operator_command($1,$2::jsonb)", [
      "read",
      JSON.stringify({ id: operation }),
    ]),
  );
});
test("documentos privados y metadatos validados", async () => {
  const p = {
    id: operation,
    target_type: "operation",
    document_type: "MSDS",
    storage_path: demoUsers.operator + "/test.pdf",
    original_name: "test.pdf",
    mime_type: "application/pdf",
    size_bytes: 100,
  };
  await command("operator", "document", p);
  assert.equal(
    (await query("competitor", "select * from public.documents where operation_id=$1",[operation])).rows.length,
    0,
  );
  await assert.rejects(
    command("operator", "document", {
      ...p,
      storage_path: demoUsers.competitor + "/test.pdf",
    }),
  );
  await assert.rejects(
    command("operator", "document", { ...p, size_bytes: 99999999 }),
  );
});
test("escrow libera una sola vez, calcula comisión y protege saldo", async () => {
  for (const phase of ["awaiting_delivery_confirmation"])
    await command("operator", "advance", { id: operation, phase });
  await assert.rejects(command("operator", "advance", { id: operation, phase: "completed" }), /importador/);
  await query("importer", "select public.transition_operation($1,'completed')", [operation]);
  const moves = await query(
    "operator",
    "select amount from public.wallet_movements where operation_id=$1",
    [operation],
  );
  assert.equal(Number(moves.rows[0].amount), 1170);
  assert.equal(moves.rows.length, 1);
  await assert.rejects(
    command("operator", "advance", { id: operation, phase: "completed" }),
  );
  await assert.rejects(
    command("operator", "withdraw", { amount: 999999, currency: "USD" }),
  );
  await command("operator", "withdraw", { amount: 10, currency: "USD" });
  assert.equal(
    (await query("operator", "select * from public.withdrawal_requests")).rows
      .length,
    1,
  );
});
test("soporte es privado y conserva respuestas", async () => {
  const r = await command("operator", "ticket", {
    subject: "Consulta de documentación",
    body: "Necesito revisar el MSDS.",
    category: "Documentación",
    priority: "normal",
  });
  await command("operator", "support_message", {
    id: r.rows[0].result.id,
    body: "Adjunto el contexto de la operación.",
  });
  assert.equal(
    (await query("competitor", "select * from public.support_tickets")).rows
      .length,
    0,
  );
  assert.equal(
    (
      await query(
        "operator",
        "select * from public.support_messages where ticket_id=$1",
        [r.rows[0].result.id],
      )
    ).rows.length,
    2,
  );
});
test("historial y reputación derivan de calificaciones y auditoría es sólo admin", async () => {
  const r = await query(
    "operator",
    "select rating from public.operator_profiles where user_id=$1",
    [demoUsers.operator],
  );
  assert.equal(Number(r.rows[0].rating), 5);
  assert.equal(
    (await query("operator", "select * from public.audit_logs")).rows.length,
    0,
  );
  assert.ok(
    (await query("admin", "select * from public.audit_logs")).rows.length > 0,
  );
});
test("alta no permite autocalificación ni oferta preadjudicada", async () => {
  await assert.rejects(
    query(
      "importer",
      "insert into public.operator_profiles(user_id,company_name,tax_id,rating) values($1,'Empresa','123456789',5)",
      [demoUsers.importer],
    ),
    /validación interna/,
  );
  await assert.rejects(
    query(
      "operator",
      "insert into public.offers(cargo_id,operator_id,mode,freight_usd,estimated_days,terms,valid_until,status) values($1,$2,'air',50,5,'Servicio',now()+interval '1 day','accepted')",
      ["b0000000-0000-0000-0000-000000008211", demoUsers.operator],
    ),
  );
});
test("suspensión revoca mensajes y operaciones de una cuenta previamente aprobada", async () => {
  await db.query(
    "update public.operator_profiles set verification_status='suspended' where user_id=$1",
    [demoUsers.operator],
  );
  try {
    assert.equal(
      (await query("operator", "select * from public.operations")).rows.length,
      0,
    );
    assert.equal(
      (await query("operator", "select * from public.messages")).rows.length,
      0,
    );
    await assert.rejects(
      command("operator", "message", {
        id: operation,
        body: "No debería poder enviar",
      }),
    );
  } finally {
    await db.query(
      "update public.operator_profiles set verification_status='approved' where user_id=$1",
      [demoUsers.operator],
    );
  }
});
test("sólo la mesa administrativa puede responder y resolver tickets", async () => {
  const ticket = "e0000000-0000-0000-0000-000000000001";
  await assert.rejects(
    query(
      "operator",
      "select public.admin_support_reply($1,'Respuesta falsa','resolved')",
      [ticket],
    ),
    /administrativo/,
  );
  await query(
    "admin",
    "select public.admin_support_reply($1,'Respuesta validada por la mesa de control','resolved')",
    [ticket],
  );
  assert.equal(
    (
      await query(
        "operator",
        "select status from public.support_tickets where id=$1",
        [ticket],
      )
    ).rows[0].status,
    "resolved",
  );
});

test("códigos humanos únicos y estables en operaciones, documentos y tickets", async () => {
  for (const [table, prefix] of [
    ["operations", "OP"],
    ["documents", "DOC"],
    ["support_tickets", "TKT"],
  ]) {
    const result = await query(
      "operator",
      `select public_code from public.${table}`,
    );
    assert.ok(result.rows.length);
    for (const row of result.rows)
      assert.match(row.public_code, new RegExp(`^${prefix}-[0-9]{4,}$`));
    assert.equal(
      new Set(result.rows.map((r) => r.public_code)).size,
      result.rows.length,
    );
  }
  const changed = await query(
    "importer",
    "update public.cargo_requests set public_code='LC-FAKE' where id=$1 returning id",
    [cargo],
  );
  assert.equal(changed.rows.length, 0, "RLS excludes contracted cargo before its code trigger");
  assert.notEqual((await query("importer", "select public_code from cargo_requests where id=$1", [cargo])).rows[0].public_code, "LC-FAKE");
});

test("CUIT y razón social aprobados bloqueados por RPC y por escritura directa", async () => {
  await assert.rejects(
    query(
      "operator",
      "update public.operator_profiles set tax_id='30-99999999-0' where user_id=$1",
      [demoUsers.operator],
    ),
    /jurídicos/,
  );
  await assert.rejects(
    command("operator", "profile", {
      company_name: "Empresa alterada",
      tax_id: "30-99999999-0",
      full_name: "Nombre válido",
    }),
    /jurídicos/,
  );
  const company = (
    await query(
      "operator",
      "select * from public.operator_profiles where user_id=$1",
      [demoUsers.operator],
    )
  ).rows[0];
  await command("operator", "profile", {
    ...company,
    full_name: "Martín Rivera",
    trade_name: "Comercial actualizado",
    modes: ["air"],
  });
  assert.equal(
    (
      await query(
        "operator",
        "select trade_name from public.operator_profiles where user_id=$1",
        [demoUsers.operator],
      )
    ).rows[0].trade_name,
    "Comercial actualizado",
  );
});

test("retiros rechazan cero, negativos, NaN, nulos y saldo excedido", async () => {
  for (const amount of [0, -1, "NaN", "Infinity", "", null, 999999999])
    await assert.rejects(
      command("operator", "withdraw", { amount, currency: "USD" }),
    );
  await assert.rejects(
    query(
      "operator",
      "select public.operator_command_base('withdraw','{}'::jsonb)",
    ),
    /permission denied/,
  );
});

test("retiros académicos aprobados o rechazados se auditan sin doble reintegro", async () => {
  const balance = async () =>
    Number(
      (
        await query(
          "operator",
          "select coalesce(sum(amount),0) as amount from public.wallet_movements where currency='USD'",
        )
      ).rows[0].amount,
    );
  const before = await balance();
  const rejected = (
    await command("operator", "withdraw", { amount: 5, currency: "USD" })
  ).rows[0].result.id;
  assert.equal(await balance(), before - 5);
  await assert.rejects(
    query(
      "operator",
      "select public.review_simulated_withdrawal($1,'rejected')",
      [rejected],
    ),
    /administrativo/,
  );
  await query(
    "admin",
    "select public.review_simulated_withdrawal($1,'rejected')",
    [rejected],
  );
  assert.equal(await balance(), before);
  await assert.rejects(
    query("admin", "select public.review_simulated_withdrawal($1,'rejected')", [
      rejected,
    ]),
    /revisada/,
  );
  const approved = (
    await command("operator", "withdraw", { amount: 5, currency: "USD" })
  ).rows[0].result.id;
  await query(
    "admin",
    "select public.review_simulated_withdrawal($1,'approved')",
    [approved],
  );
  assert.equal(await balance(), before - 5);
  const statuses = await query(
    "operator",
    "select status from public.withdrawal_requests where id in ($1,$2)",
    [rejected, approved],
  );
  assert.deepEqual(statuses.rows.map((r) => r.status).sort(), [
    "approved",
    "rejected",
  ]);
});

test("adjuntos de soporte privados, disponibles para pendientes y cerrados al resolver", async () => {
  const ticket = (
    await command("pending", "ticket", {
      subject: "Revisar habilitación",
      body: "Adjunto la constancia solicitada.",
      category: "Cuenta",
      priority: "high",
    })
  ).rows[0].result.id;
  const payload = {
    target_type: "support",
    id: ticket,
    document_type: "Otro",
    original_name: "constancia.pdf",
    storage_path: `${demoUsers.pending}/support.pdf`,
    mime_type: "application/pdf",
    size_bytes: 100,
  };
  const doc = (await command("pending", "document", payload)).rows[0].result.id;
  assert.equal(
    (
      await query("pending", "select * from public.documents where id=$1", [
        doc,
      ])
    ).rows.length,
    1,
  );
  for (const actor of ["operator", "competitor", "suspended"])
    assert.equal(
      (await query(actor, "select * from public.documents where id=$1", [doc]))
        .rows.length,
      0,
    );
  await assert.rejects(
    command("operator", "document", {
      ...payload,
      storage_path: `${demoUsers.operator}/attack.pdf`,
    }),
  );
  await query(
    "admin",
    "select public.admin_support_reply($1,'Solicitud resuelta','resolved')",
    [ticket],
  );
  await assert.rejects(command("pending", "document", payload));
});

test("reemplazo documental conserva versiones y rechaza cambios de tipo o ramas", async () => {
  const payload = {
    target_type: "operator",
    document_type: "Credencial del operador",
    original_name: "credencial.pdf",
    storage_path: `${demoUsers.operator}/credential.pdf`,
    mime_type: "application/pdf",
    size_bytes: 120,
  };
  const original = (await command("operator", "document", payload)).rows[0]
    .result.id;
  await assert.rejects(
    command("operator", "document", {
      ...payload,
      replaces_id: original,
      document_type: "MSDS",
    }),
    /tipo/,
  );
  const replacement = (
    await command("operator", "document", {
      ...payload,
      storage_path: `${demoUsers.operator}/credential-v2.pdf`,
      replaces_id: original,
    })
  ).rows[0].result.id;
  await assert.rejects(
    command("operator", "document", { ...payload, replaces_id: original }),
    /reciente/,
  );
  assert.equal(
    (
      await query(
        "operator",
        "select replaces_id from public.documents where id=$1",
        [replacement],
      )
    ).rows[0].replaces_id,
    original,
  );
  assert.equal(
    (
      await query("operator", "select id from public.documents where id=$1", [
        original,
      ])
    ).rows.length,
    1,
  );
  await assert.rejects(
    query(
      "admin",
      "update public.documents set validation_status='rejected' where id=$1",
      [replacement],
    ),
    /motivo/,
  );
  await query(
    "admin",
    "update public.documents set validation_status='rejected',rejection_reason='Credencial vencida' where id=$1",
    [replacement],
  );
  await query(
    "admin",
    "update public.documents set validation_status='approved',rejection_reason=null where id=$1",
    [replacement],
  );
  await assert.rejects(
    command("operator", "document", { ...payload, replaces_id: replacement }),
  );
  const logs = await query(
    "admin",
    "select action from public.audit_logs where entity_id=$1",
    [replacement],
  );
  assert.ok(logs.rows.some((l) => l.action === "documents.update"));
});
