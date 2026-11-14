import test from "node:test";
import assert from "node:assert/strict";
import {
  canOperate,
  canTransition,
  validateOffer,
  validateDocument,
  reputation,
  simulatedNet,
  operationTransitions,
} from "../.test-dist/operator.js";
const valid = {
  amount: 1200,
  days: 8,
  mode: "air",
  status: "approved",
  closesAt: "2099-01-01",
  cargoStatus: "open",
  hasActiveOffer: false,
};
test("sólo operadores aprobados pueden operar", () => {
  assert.equal(canOperate("operator", "approved"), true);
  for (const s of ["pending", "rejected", "suspended"])
    assert.equal(canOperate("operator", s), false);
  assert.equal(canOperate("importer", "approved"), false);
});
test("oferta válida, duplicada, vencida, bloqueada y con tarifa inválida", () => {
  assert.equal(validateOffer(valid), null);
  for (const change of [
    { amount: 0 },
    { amount: NaN },
    { amount: 1.111 },
    { days: 0 },
    { days: 1.5 },
    { mode: "truck" },
    { status: "pending" },
    { status: "suspended" },
    { closesAt: "2000-01-01" },
    { closesAt: "invalid" },
    { cargoStatus: "awarded" },
    { hasActiveOffer: true },
  ])
    assert.ok(validateOffer({ ...valid, ...change }), JSON.stringify(change));
});
test("ninguna etapa permite saltar de adjudicada a completada", () => {
  assert.equal(canTransition("created", "completed"), false);
  assert.equal(canTransition("in_progress", "awaiting_delivery_confirmation"), true);
  assert.equal(canTransition("awaiting_delivery_confirmation", "completed"), true);
  for (const s of ["completed", "cancelled", "disputed"])
    assert.deepEqual(operationTransitions[s], []);
});
test("documentos limitan tamaño, MIME y extensión", () => {
  assert.equal(validateDocument("msds.pdf", 100, "application/pdf"), null);
  for (const a of [
    ["x.exe", 100, "application/pdf"],
    ["x.pdf", 0, "application/pdf"],
    ["x.pdf", 10485761, "application/pdf"],
    ["x.png", 100, "text/html"],
  ])
    assert.ok(validateDocument(...a));
});
test("reputación deriva de puntuaciones registradas", () => {
  assert.deepEqual(reputation([]), {
    average: null,
    count: 0,
    rank: "Sin historial",
  });
  assert.deepEqual(reputation([5, 5, 4, 99]), {
    average: 4.7,
    count: 3,
    rank: "Gold",
  });
});
test("escrow simulado descuenta comisión sin dinero real", () => {
  assert.equal(simulatedNet(1200), 1170);
  assert.equal(simulatedNet(565), 550.87);
  assert.throws(() => simulatedNet(-5));
});
