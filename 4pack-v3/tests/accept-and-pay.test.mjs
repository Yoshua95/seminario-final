import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import ts from "typescript";
import {
  createLocalDatabase,
  asUser,
  demoUsers as users,
} from "../scripts/local-database.mjs";
import { quoteFixture } from "./quote-fixture.mjs";
const source = await readFile(
    new URL("../apps/mobile/lib/accept-and-pay.ts", import.meta.url),
    "utf8",
  ),
  js = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ES2022,
    },
  }).outputText,
  { acceptOfferAndPay, CheckoutAfterAwardError } = await import(
    "data:text/javascript;base64," + Buffer.from(js).toString("base64")
  );
let db;
const q = (actor, sql, args = []) =>
  asUser(db, users[actor] ?? actor, sql, args);
before(async () => {
  db = await createLocalDatabase();
  for (const name of [
    "20261119024020_ars_only_new_contracts.sql",
    "20261119180708_offer_capital_reservations.sql",
    "20261119225500_accept_offer_test_checkout.sql",
  ])
    await db.exec(
      await readFile(
        new URL("../supabase/migrations/" + name, import.meta.url),
        "utf8",
      ),
    );
});
after(() => db?.close());
async function offer() {
  const cargo = randomUUID();
  await db.query(
    "insert into public.cargo_requests(id,importer_id,title,description,origin,destination,category,weight_kg,volume_m3,fob_usd,status,bidding_deadline)values($1,$2,'Checkout candidato','Textiles de ensayo','China','Argentina','Otro',1,1,1100,'open',now()+interval '2 days')",
    [cargo, users.importer],
  );
  return (
    await q("operator", "select public.quote_command('submit',$1::jsonb) r", [
      JSON.stringify({
        cargo_id: cargo,
        quote: quoteFixture({
          currency: "ARS",
          amount: "250000",
          working_capital_amount: "1000",
        }),
      }),
    ])
  ).rows[0].r.id;
}
test("checkout apagado impide adjudicar y conserva el respaldo de la oferta", async () => {
  const f = await offer();
  await assert.rejects(
    q("importer", "select public.award_offer_for_test_checkout($1)", [f]),
    /desactivado/,
  );
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from public.operations where accepted_offer_id=$1",
        [f],
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.query(
        "select state from public.offer_capital_reservations where offer_id=$1",
        [f],
      )
    ).rows[0].state,
    "reserved",
  );
});
test("aceptar para pagar crea modo de prueba, transfiere una vez y respeta roles", async () => {
  await db.exec("update public.mp_test_settings set enabled=true");
  const f = await offer();
  await assert.rejects(
    q("operator", "select public.award_offer_for_test_checkout($1)", [f]),
    /importador/,
  );
  const a = (
      await q(
        "importer",
        "select public.award_offer_for_test_checkout($1) id",
        [f],
      )
    ).rows[0].id,
    b = (
      await q(
        "importer",
        "select public.award_offer_for_test_checkout($1) id",
        [f],
      )
    ).rows[0].id;
  assert.equal(a, b);
  const op = (
    await db.query(
      "select payment_mode,contract_currency from public.operations where id=$1",
      [a],
    )
  ).rows[0];
  assert.deepEqual(op, {
    payment_mode: "mercado_pago_test",
    contract_currency: "ARS",
  });
  assert.equal(
    (
      await db.query(
        "select state from public.offer_capital_reservations where offer_id=$1",
        [f],
      )
    ).rows[0].state,
    "transferred",
  );
  assert.equal(
    Number(
      (
        await db.query(
          "select working_capital_required from public.operation_capacity_reservations where operation_id=$1",
          [a],
        )
      ).rows[0].working_capital_required,
    ),
    1000,
  );
});
test("fallo al adjudicar no invoca checkout", async () => {
  let calls = 0;
  await assert.rejects(
    acceptOfferAndPay("offer", {
      award: async () => {
        throw Error("Sin capital");
      },
      checkout: async () => {
        calls++;
      },
    }),
    /Sin capital/,
  );
  assert.equal(calls, 0);
});
test("fallo de proveedor conserva UUID recuperable y el reintento usa la misma operacion", async () => {
  const ids = [];
  const deps = {
    award: async () => "same-operation",
    checkout: async (id) => {
      ids.push(id);
      throw Error("Red no disponible");
    },
  };
  await assert.rejects(
    acceptOfferAndPay("offer", deps),
    (e) =>
      e instanceof CheckoutAfterAwardError &&
      e.operationId === "same-operation",
  );
  const result = await acceptOfferAndPay("offer", {
    ...deps,
    checkout: async (id) => {
      ids.push(id);
      return {
        status: "ready",
        checkout_url:
          "https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=fixture",
      };
    },
  });
  assert.equal(result.status, "ready");
  assert.deepEqual(ids, ["same-operation", "same-operation"]);
});
