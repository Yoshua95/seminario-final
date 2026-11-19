import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source = await readFile(
  new URL("../apps/web/src/features/admin/operation-task.ts", import.meta.url),
  "utf8",
);
const js = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { operationTask } = await import(
  "data:text/javascript;base64," + Buffer.from(js).toString("base64")
);
const op = { id: "legacy", phase: "in_progress", cargo_id: "cargo" },
  base = () => ({
    claims: [],
    documents: [],
    guarantees: [{ operation_id: op.id, status: "held_simulated" }],
  });
for (const [title, contracts] of [
  ["sin contrato", []],
  ["snapshot SQL/JSON nulo", [{ operation_id: op.id, content: null }]],
  ["quote nulo", [{ operation_id: op.id, content: { quote: null } }]],
  ["términos incompletos", [{ operation_id: op.id, content: { quote: {} } }]],
])
  test(title + " requiere revisión sin lanzar TypeError", () =>
    assert.deepEqual(operationTask({ ...base(), contracts }, op), {
      label: "Contrato pendiente de revisión",
      owner: "Administración",
    }),
  );
test("contrato completo conserva la tarea documental y su responsable", () => {
  const data = {
    ...base(),
    contracts: [
      {
        operation_id: op.id,
        content: { quote: { required_documents: ["Packing list"] } },
      },
    ],
  };
  assert.deepEqual(operationTask(data, op), {
    label: "Adjuntar Packing list",
    owner: "Importador",
  });
  data.documents.push({
    operation_id: op.id,
    document_type: "Packing list",
    validation_status: "pending",
  });
  assert.deepEqual(operationTask(data, op), {
    label: "Validar Packing list",
    owner: "Administración",
  });
});
test("sin contrato preserva las tareas conocidas de entrega, pago, reclamo y cierre", () => {
  const data = {
    ...base(),
    contracts: [{ operation_id: op.id, content: null }],
  };
  assert.equal(
    operationTask(data, { ...op, phase: "awaiting_delivery_confirmation" })
      .label,
    "Confirmar recepción",
  );
  data.guarantees[0].status = "pending";
  assert.equal(
    operationTask(data, op).label,
    "Confirmar pago o garantía pendiente",
  );
  assert.equal(
    operationTask(data, { ...op, phase: "completed" }).label,
    "Consultar cierre e historial",
  );
  data.claims = [{ operation_id: op.id, status: "open" }];
  assert.equal(operationTask(data, op).label, "Revisar reclamo y evidencia");
});
