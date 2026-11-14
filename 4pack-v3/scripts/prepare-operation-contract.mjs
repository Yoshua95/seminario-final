import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const contract = JSON.parse(await readFile(new URL("packages/domain/src/operation-contract.json", root), "utf8"));
const file = new URL("supabase/migrations/0016_operation_contract.sql", root);
const source = await readFile(file, "utf8");
const generated = `-- BEGIN GENERATED CONTRACT\ncreate or replace function public.operation_contract() returns jsonb language sql immutable as $contract$ select '${JSON.stringify(contract)}'::jsonb $contract$;\n-- END GENERATED CONTRACT`;
const result = source.replace(/-- BEGIN GENERATED CONTRACT[\s\S]*?-- END GENERATED CONTRACT/, generated);
if (process.argv.includes("--check")) {
  if (result !== source) throw new Error("Contrato SQL desactualizado respecto al dominio");
} else if (result !== source) await writeFile(file, result);
