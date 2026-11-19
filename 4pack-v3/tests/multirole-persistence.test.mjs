import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
test("multirrol: reserva, garantia, evidencia y cierre sobreviven tres procesos sin duplicados", async () => {
  await mkdir(".4pack-demo", { recursive: true });
  const directory = await mkdtemp(
    path.resolve(".4pack-demo/multirole-persistence-"),
  );
  const worker = fileURLToPath(
    new URL("./fixtures/multirole-persistence-worker.mjs", import.meta.url),
  );
  for (const phase of ["create", "complete", "verify"]) {
    const result = spawnSync(process.execPath, [worker, directory, phase], {
      encoding: "utf8",
      windowsHide: true,
      timeout: 60000,
    });
    assert.equal(
      result.status,
      0,
      `${phase}: ${result.stderr}\n${result.stdout}`,
    );
    assert.equal(
      JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)).passed,
      true,
    );
  }
});
