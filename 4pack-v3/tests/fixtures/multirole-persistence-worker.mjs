// Runs in separate Node processes to verify disk persistence, not just page reloads.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../../scripts/local-database.mjs";
import { quoteFixture } from "../quote-fixture.mjs";
import { gatewayDocument } from "../document-gateway-helper.mjs";
const [directory, phase] = process.argv.slice(2);
if (!directory || !["create", "complete", "verify"].includes(phase))
  throw Error("Invalid worker arguments");
const db = await createLocalDatabase(path.join(directory, "database"));
const statePath = path.join(directory, "scenario.json");
const operator = users.pending,
  importer = users.importer;
const q = (actor, sql, params = []) => asUser(db, actor, sql, params);
const snapshot = async () =>
  (await q(operator, "select public.operator_capacity_snapshot() s")).rows[0].s;
const result = async (sql, params = []) =>
  (await q(importer, sql, params)).rows[0];
let state;
try {
  if (phase === "create") {
    assert.equal(
      (
        await q(
          users.admin,
          "select verification_status from public.operator_profiles where user_id=$1",
          [operator],
        )
      ).rows[0].verification_status,
      "pending",
    );
    await q(
      users.admin,
      "update public.operator_profiles set verification_status='approved',verified_at=now(),verified_by=auth.uid() where user_id=$1",
      [operator],
    );
    await q(
      users.admin,
      "select public.configure_operator_capacity($1,$2::jsonb)",
      [
        operator,
        JSON.stringify({
          currency: "USD",
          max_operations: "1",
          max_weight_kg: "100",
          max_volume_m3: "10",
          max_per_operation: "2000",
          max_exposure: "2000",
          declared_working_capital: "500",
          approved_working_capital: "500",
          status: "active",
          valid_from: "2020-01-01T00:00:00Z",
          reason: "Aprobacion ficticia para prueba multirrol aislada",
        }),
      ],
    );
    const cargo = randomUUID();
    await q(
      importer,
      "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline) values($1,auth.uid(),'Carga estandar multirrol','Carga general sin materiales peligrosos','Origen ficticio','Destino ficticio','Textil',10,1,2000,'open',now()+interval '1 day')",
      [cargo],
    );
    const offer = (
      await q(operator, "select public.quote_command('submit',$1::jsonb) r", [
        JSON.stringify({
          cargo_id: cargo,
          quote: quoteFixture({ working_capital_amount: "200" }),
        }),
      ])
    ).rows[0].r.id;
    assert.equal(
      (
        await q(
          importer,
          "select normalized_quote from public.offers where id=$1",
          [offer],
        )
      ).rows[0].normalized_quote.working_capital_amount,
      "200",
    );
    const operation = (
      await result("select public.award_offer($1) id", [offer])
    ).id;
    assert.equal(
      (await snapshot()).reservations.find((r) => r.operation_id === operation)
        .state,
      "reserved",
    );
    assert.equal(
      (await result("select public.award_offer($1) id", [offer])).id,
      operation,
    );
    await q(importer, "select public.simulate_guarantee($1)", [operation]);
    const document = (
      await gatewayDocument(db, operator, {
        id: operation,
        target_type: "operation",
        document_type: "Constancia de entrega",
        storage_path: operator + "/" + randomUUID() + ".pdf",
        original_name: "evidencia-prueba.pdf",
        mime_type: "application/pdf",
        size_bytes: 100,
      })
    ).rows[0].result.id;
    await q(operator, "select public.operator_command('milestone',$1::jsonb)", [
      JSON.stringify({
        id: operation,
        event_type: "Carga recibida en origen",
        description: "Recepcion ficticia con evidencia",
        location: "Deposito ficticio",
        occurred_at: new Date().toISOString(),
        attachment_id: document,
      }),
    ]);
    state = { cargo, offer, operation, document, operator, importer };
    await writeFile(statePath, JSON.stringify(state, null, 2));
  } else state = JSON.parse(await readFile(statePath, "utf8"));
  const initial = await result(
    "select o.phase,g.status from public.operations o join public.payment_guarantees g on g.operation_id=o.id where o.id=$1",
    [state.operation],
  );
  if (phase === "complete") {
    assert.equal(initial.phase, "confirmed");
    assert.equal(initial.status, "held_simulated");
    assert.equal(
      (await snapshot()).reservations.find(
        (r) => r.operation_id === state.operation,
      ).state,
      "active",
    );
    assert.equal(
      (
        await q(
          operator,
          "select attachment_id from public.tracking_events where operation_id=$1 and attachment_id=$2",
          [state.operation, state.document],
        )
      ).rows.length,
      1,
    );
    assert.equal(
      (await result("select public.award_offer($1) id", [state.offer])).id,
      state.operation,
    );
    await assert.rejects(
      q(importer, "select public.simulate_guarantee($1)", [state.operation]),
      /pendiente/,
    );
    await q(operator, "select public.transition_operation($1,'in_progress')", [
      state.operation,
    ]);
    await q(
      operator,
      "select public.transition_operation($1,'awaiting_delivery_confirmation')",
      [state.operation],
    );
    await q(importer, "select public.transition_operation($1,'completed')", [
      state.operation,
    ]);
    for (const [author, recipient] of [
      [importer, operator],
      [operator, importer],
    ])
      await q(
        author,
        "insert into public.ratings(operation_id,author_id,recipient_id,score,comment) values($1,auth.uid(),$2,5,$3)",
        [state.operation, recipient, "Experiencia ficticia de prueba"],
      );
  }
  if (phase === "verify") {
    assert.equal(initial.phase, "completed");
    assert.equal(initial.status, "released_simulated");
    assert.equal(
      (await result("select public.award_offer($1) id", [state.offer])).id,
      state.operation,
    );
    await q(users.admin, "select public.admin_release_capacity($1,$2)", [
      state.operation,
      "Reintento posterior a reinicio",
    ]);
    await assert.rejects(
      q(importer, "select public.transition_operation($1,'completed')", [
        state.operation,
      ]),
      /inválida/,
    );
    await assert.rejects(
      q(
        importer,
        "insert into public.ratings(operation_id,author_id,recipient_id,score) values($1,auth.uid(),$2,5)",
        [state.operation, operator],
      ),
      /duplicate/,
    );
  }
  if (phase !== "create") {
    const s = await snapshot();
    assert.equal(s.usage.operations, 0);
    assert.equal(
      s.reservations.find((r) => r.operation_id === state.operation).state,
      "released",
    );
    const movements = (
      await q(
        operator,
        "select amount,currency from public.wallet_movements where operation_id=$1",
        [state.operation],
      )
    ).rows;
    assert.equal(movements.length, 1);
    assert.equal(Number(movements[0].amount), 975);
    assert.equal(movements[0].currency, "USD");
    assert.equal(
      (
        await q(
          operator,
          "select count(*)::int n from public.capacity_events where operation_id=$1 and action='released'",
          [state.operation],
        )
      ).rows[0].n,
      1,
    );
    assert.equal(
      (
        await q(
          importer,
          "select count(*)::int n from public.ratings where operation_id=$1",
          [state.operation],
        )
      ).rows[0].n,
      2,
    );
    assert.equal(
      (
        await q(
          users.competitor,
          "select id from public.operations where id=$1",
          [state.operation],
        )
      ).rows.length,
      0,
    );
  }
  console.log(
    JSON.stringify({ phase, passed: true, operation: state.operation }),
  );
} finally {
  await db.close();
}
