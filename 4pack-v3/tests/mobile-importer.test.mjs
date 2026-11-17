import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
import { randomUUID } from "node:crypto";
import {
  createLocalDatabase,
  asUser,
  demoUsers as u,
} from "../scripts/local-database.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
const source = await readFile(
  new URL("../apps/mobile/lib/importer-flow.ts", import.meta.url),
  "utf8",
);
const target = new URL("../.test-dist/mobile-importer.mjs", import.meta.url);
await writeFile(
  target,
  ts.transpileModule(
    source.replace(
      '"@4pack/domain"',
      JSON.stringify(new URL("../.test-dist/index.js", import.meta.url).href),
    ),
    {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    },
  ).outputText,
);
const {
  compareImporterOffers,
  validateImporterRating,
  importerOperationAction,
} = await import(target.href);
test("importador mobile: comparacion no equipara moneda ni alcance distintos", () => {
  const a = {
    id: "a",
    status: "submitted",
    currency: "USD",
    quote: quoteFixture(),
  };
  assert.equal(
    compareImporterOffers([a, { ...a, id: "b", amount: 20 }]),
    false,
  );
  assert.equal(
    compareImporterOffers([a, { ...a, id: "b", currency: "ARS" }]),
    true,
  );
  assert.equal(
    compareImporterOffers([
      a,
      { ...a, id: "b", quote: { ...a.quote, scope: "Otro alcance" } },
    ]),
    true,
  );
  assert.equal(
    compareImporterOffers([a, { ...a, status: "rejected", currency: "ARS" }]),
    false,
  );
});
test("importador mobile: evaluacion limita puntaje y longitud", () => {
  validateImporterRating(5, "Servicio correcto");
  for (const score of [0, 6, 1.5, NaN])
    assert.throws(() => validateImporterRating(score, ""));
  assert.throws(() => validateImporterRating(5, "a".repeat(501)));
});
test("importador mobile: propaga error RPC sin avanzar silenciosamente", async () => {
  await assert.rejects(
    importerOperationAction("award", "offer", async () => ({
      data: null,
      error: { message: "MSDS requerido" },
    })),
    /MSDS/,
  );
});
test("adaptador mobile y operador SQL comparten IDs: adjudicacion, garantia, cierre y Capacity", async () => {
  const db = await createLocalDatabase();
  try {
    const data = {
      title: "Textiles mobile",
      description: "Prendas de algodon",
      origin: "China",
      destination: "Argentina",
      category: "Textiles",
      weight_kg: 10,
      volume_m3: 1,
      fob_usd: 2000,
    };
    const cargo = (
      await asUser(
        db,
        u.importer,
        "select public.prepare_cargo_publication($1,$2::jsonb) id",
        [randomUUID(), JSON.stringify(data)],
      )
    ).rows[0].id;
    await asUser(db, u.importer, "select public.publish_cargo($1)", [cargo]);
    const offer = (
      await asUser(
        db,
        u.operator,
        "select public.quote_command('submit',$1::jsonb) r",
        [JSON.stringify({ cargo_id: cargo, quote: quoteFixture() })],
      )
    ).rows[0].r.id;
    const sql = {
      award_offer: "select public.award_offer($1) result",
      simulate_guarantee: "select public.simulate_guarantee($1) result",
      transition_operation:
        "select public.transition_operation($1,'completed') result",
    };
    const rpc = async (name, args) => {
      try {
        const result = await asUser(db, u.importer, sql[name], [
          args.target_offer_id ?? args.target_operation_id ?? args.target,
        ]);
        return { data: result.rows[0].result, error: null };
      } catch (error) {
        return { data: null, error: { message: error.message } };
      }
    };
    const op = await importerOperationAction("award", offer, rpc);
    assert.equal(await importerOperationAction("award", offer, rpc), op);
    await importerOperationAction("guarantee", op, rpc);
    await asUser(
      db,
      u.operator,
      "select public.transition_operation($1,'in_progress')",
      [op],
    );
    await asUser(
      db,
      u.operator,
      "select public.transition_operation($1,'awaiting_delivery_confirmation')",
      [op],
    );
    await importerOperationAction("complete", op, rpc);
    const row = (
      await db.query(
        "select o.cargo_id,o.phase,r.state,g.status from public.operations o join public.operation_capacity_reservations r on r.operation_id=o.id join public.payment_guarantees g on g.operation_id=o.id where o.id=$1",
        [op],
      )
    ).rows[0];
    assert.deepEqual(row, {
      cargo_id: cargo,
      phase: "completed",
      state: "released",
      status: "released_simulated",
    });
  } finally {
    await db.close();
  }
});
