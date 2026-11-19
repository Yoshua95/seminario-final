import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { internalImporterSession } from "../scripts/internal-importer-session.mjs";
const base = "http://127.0.0.1:3015",
  out = ".4pack-demo/admin-null-access";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const c = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(base + "/demo/acceso");
  assert.deepEqual(
    await p
      .locator("[name=account] option")
      .evaluateAll((options) => options.map((o) => o.value)),
    ["operator", "admin"],
  );
  assert.equal(await p.locator("[name=account]").inputValue(), "operator");
  await p.screenshot({ path: out + "/acceso.png" });
  await p.locator("[name=account]").selectOption("admin");
  await p.getByRole("button", { name: "Entrar al ensayo multirrol" }).click();
  await p.waitForURL("**/demo/admin");
  const r = await p.goto(base + "/demo/admin/operaciones");
  await p.getByRole("heading", { name: "Operaciones", exact: true }).waitFor();
  assert.equal(r.status(), 200);
  const legacy = p.locator("tbody tr").filter({ hasText: "OP-1001" }),
    complete = p.locator("tbody tr").filter({ hasText: "OP-1005" });
  assert.ok(
    (await legacy.innerText()).includes("Contrato pendiente de revisión"),
  );
  assert.ok(
    (await complete.innerText()).includes("Consultar cierre e historial"),
  );
  assert.equal(await p.locator("tbody tr").count(), 4);
  await p.screenshot({ path: out + "/operaciones.png" });
  assert.deepEqual(errors, []);
  const internal = await browser.newContext();
  await internalImporterSession(
    internal,
    base,
    path.resolve(".4pack-demo/block16-final"),
  );
  const ip = await internal.newPage();
  await ip.goto(base + "/demo/importador");
  await ip.getByRole("heading", { name: "Mis cargas", exact: true }).waitFor();
  assert.ok(ip.url().includes("/demo/importador"));
  await internal.close();
  const forged = await browser.newContext(),
    fp = await forged.newPage();
  fp.on("pageerror", () => {});
  await fp.goto(base + "/demo/acceso");
  await fp.locator("[name=account]").evaluate((e) => {
    e.add(new Option("forged", "importer"));
    e.value = "importer";
  });
  const response = fp.waitForResponse((r) => r.request().method() === "POST");
  await fp.getByRole("button", { name: "Entrar al ensayo multirrol" }).click();
  await (await response).finished();
  assert.equal(
    (await forged.cookies()).some((x) => x.name === "fourpack-multirole"),
    false,
  );
  await forged.close();
  const result = {
    publicRoles: ["operator", "admin"],
    defaultRole: "operator",
    operationsHttp: 200,
    unchangedRows: 4,
    nullSnapshotRow: "OP-1001",
    completeContractRow: "OP-1005",
    errors,
    internalImporter: true,
    forgedImporterBlocked: true,
  };
  await fs.writeFile(out + "/resultado.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  await browser.close();
}
