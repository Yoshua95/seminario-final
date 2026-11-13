import assert from "node:assert/strict";
import test from "node:test";
import { calculateCommission, requiresHazmatReview } from "../.test-dist/index.js";

test("detecta términos HAZMAT con mayúsculas y acentos", () => {
  assert.equal(requiresHazmatReview("Accesorios con BATERÍA de litio"), true);
  assert.equal(requiresHazmatReview("Carga con líquido inflamable"), true);
  assert.equal(requiresHazmatReview("Imanes industriales"), true);
});

test("no marca una carga general como HAZMAT", () => {
  assert.equal(requiresHazmatReview("Bolsos de cuero y accesorios textiles"), false);
});

test("calcula la comisión estándar del 2,5 % con dos decimales", () => {
  assert.equal(calculateCommission(565), 14.13);
  assert.equal(calculateCommission(1000), 25);
});

test("permite una tasa de comisión configurable", () => {
  assert.equal(calculateCommission(1250.5, 0.01), 12.51);
});
