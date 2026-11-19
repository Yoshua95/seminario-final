import { chromium } from "playwright-core";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
const base = process.env.FOURPACK_CAPITAL_TEST_URL ?? "http://localhost:3015";
if (!/^http:\/\/(localhost|127\.0\.0\.1):3015$/.test(base))
  throw Error("ISOLATED_LOOPBACK_REQUIRED");
const out = ".4pack-demo/capital-admin/browser";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.connectOverCDP(
  process.env.FOURPACK_TEST_CDP ?? "http://127.0.0.1:9233",
);
const pages = {},
  contexts = [],
  results = [];
let failed;
async function actor(role) {
  const c = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  contexts.push(c);
  const p = await c.newPage();
  await p.goto(base + "/demo/acceso");
  await p.locator("[name=account]").selectOption(role);
  await p.getByRole("button", { name: "Entrar al ensayo multirrol" }).click();
  await p.waitForURL((u) => !u.pathname.includes("/acceso"));
  pages[role] = p;
  return p;
}
async function submit(p, form) {
  const response = p.waitForResponse(
    (r) => r.request().method() === "POST" && r.url().startsWith(base),
  );
  await form.getByRole("button").last().click();
  await (await response).finished();
  await p.waitForTimeout(400);
  const alerts = (await p.getByRole("alert").allTextContents()).filter((t) =>
    t.trim(),
  );
  if (alerts.length) throw Error(alerts.join(" · "));
}
async function step(name, fn) {
  await fn();
  results.push({ name, result: "PASS" });
  console.log("PASS " + name);
}
async function navigate(page, url) {
  await page.goto(url);
  await page.reload();
  await page.locator("h1").first().waitFor();
}
try {
  const admin = await actor("admin"),
    operator = await actor("operator"),
    importer = await actor("importer");
  await step(
    "navegacion administrativa exclusiva y acceso por rol",
    async () => {
      await navigate(admin, base + "/demo/admin");
      const menu = await admin
        .getByRole("navigation", { name: "Administración", exact: true })
        .innerText();
      assert.equal(menu.includes("Mis ofertas"), false);
      for (const label of [
        "Inicio",
        "Operadores",
        "Capacidad",
        "Operaciones",
        "Reclamos",
        "Importadores",
        "Mi perfil",
      ])
        assert.ok(menu.includes(label));
      for (const p of [operator, importer]) {
        await p.goto(base + "/demo/admin");
        assert.equal(p.url().includes("/demo/admin"), false);
      }
      await admin.screenshot({ path: out + "/inicio-admin.png" });
    },
  );
  await step(
    "alta de postulacion con capital inicial desde pantalla",
    async () => {
      await navigate(
        admin,
        base +
          "/demo/admin/operadores?tab=postulaciones&id=a0000000-0000-0000-0000-000000000007",
      );
      const f = admin
        .locator("form")
        .filter({ has: admin.locator("[name=command][value=operator]") });
      if (await f.count()) {
        for (const key of ["identity", "company", "documents"])
          await f.locator("[name=" + key + "]").check();
        await f.locator("[name=amount]").fill("1000");
        await f
          .locator("[name=reason]")
          .fill("Documentacion ficticia cotejada para ensayo aislado");
        await submit(admin, f);
      }
      await navigate(
        admin,
        base + "/demo/admin/capacidad?id=a0000000-0000-0000-0000-000000000007",
      );
      assert.ok(
        (await admin.locator("body").innerText()).includes(
          "Operador multirrol ficticio",
        ),
      );
      await admin.screenshot({ path: out + "/capacidad-admin.png" });
    },
  );
  let cargo, operation;
  await step(
    "perfil integrado, suspendidos registrados y adjuntos por rol",
    async () => {
      await navigate(operator, base + "/demo/operador/perfil");
      await operator.screenshot({ path: out + "/perfil-empresarial.png" });
      assert.equal(
        await operator
          .getByRole("navigation")
          .getByRole("link", { name: "Capacidad", exact: true })
          .count(),
        0,
      );
      await navigate(operator, base + "/demo/operador/capacidad");
      assert.ok(operator.url().includes("/perfil#capital-operativo"));
      await navigate(admin, base + "/demo/admin/operadores");
      assert.ok(
        (await admin.locator("tbody").innerText()).includes(
          "Empresa suspendida",
        ),
      );
      await admin.screenshot({ path: out + "/operadores-registrados.png" });
      const file =
          "/demo/multirole/documentos/f2000000-0000-0000-0000-000000000007",
        a = await admin.request.get(base + file),
        b = await importer.request.get(base + file);
      assert.equal(a.status(), 200);
      assert.equal(b.status(), 404);
      assert.ok((await a.body()).subarray(0, 4).toString() === "%PDF");
    },
  );
  await step("importador publica carga nueva con FOB USD 1100", async () => {
    await navigate(importer, base + "/demo/importador/cargas/nueva");
    for (const [key, value] of Object.entries({
      title: "Capital aislado " + Date.now(),
      origin: "Shenzhen",
      destination: "Buenos Aires",
      category: "Otro",
      weight_kg: "10",
      volume_m3: "1",
      fob_usd: "1100",
      description: "Textiles de muestra para el ensayo aislado",
    }))
      await importer
        .locator("form[data-command=cargo] [name=" + key + "]")
        .fill(value);
    await importer.getByRole("button", { name: /Publicar/ }).click();
    const link = importer.getByRole("link", { name: "Ver carga publicada" });
    await link.waitFor();
    cargo = (await link.getAttribute("href")).split("/").at(-1);
    await link.click();
    await importer.screenshot({ path: out + "/carga-importador.png" });
  });
  await step(
    "operador presenta oferta respaldada desde panel lateral",
    async () => {
      await navigate(operator, base + "/demo/operador/oportunidades/" + cargo);
      await operator
        .getByRole("button", { name: "Cotizar", exact: true })
        .click();
      const f = operator.locator("form.op-quote-editor");
      await f.locator("[name=estimated_days]").fill("9");
      await f.getByLabel("Transporte internacional", { exact: true }).check();
      await f.locator("[name=amount]").fill("250000");
      await f.locator("[name=working_capital_amount]").fill("600");
      await f
        .locator("[name=valid_until]")
        .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
      await f.locator("[name=required_documents]").fill("Packing list");
      await f
        .getByRole("button", { name: "Revisar oferta", exact: true })
        .click();
      await operator
        .getByRole("button", { name: "Enviar oferta", exact: true })
        .click();
      await operator
        .getByText("Tu oferta está presentada y sellada.", { exact: false })
        .waitFor();
      await navigate(
        operator,
        base + "/demo/operador/perfil#capital-operativo",
      );
      const body = await operator.locator("body").innerText();
      assert.ok(body.includes("600,00"));
      await operator.screenshot({ path: out + "/oferta-reservada.png" });
    },
  );
  await step(
    "importador compara y adjudica; confirma garantia simulada",
    async () => {
      await navigate(importer, base + "/demo/importador/cargas/" + cargo);
      assert.ok(
        (await importer.locator("body").innerText()).includes(
          "Capital reservado",
        ),
      );
      await importer
        .getByRole("button", { name: "Adjudicar oferta", exact: true })
        .click();
      const link = importer
        .getByRole("link", { name: "Ver operación creada", exact: true })
        .first();
      await link.waitFor();
      operation = (await link.getAttribute("href")).split("/").at(-1);
      await link.click();
      await importer
        .getByRole("button", {
          name: "Confirmar garantía simulada",
          exact: true,
        })
        .click();
      await importer
        .locator("[data-testid=guarantee-status][data-state=held_simulated]")
        .waitFor();
      await importer.screenshot({ path: out + "/operacion-importador.png" });
      await navigate(
        operator,
        base + "/demo/operador/perfil#capital-operativo",
      );
      await operator
        .locator(
          '[data-testid="capital-breakdown"][data-offers="0"][data-operations="600"][data-available="400"]',
        )
        .waitFor();
      await operator.screenshot({ path: out + "/reserva-transferida.png" });
    },
  );
  await step("rechazo por capital insuficiente desde cotizacion", async () => {
    await navigate(importer, base + "/demo/importador/cargas/nueva");
    for (const [key, value] of Object.entries({
      title: "Capital insuficiente " + Date.now(),
      origin: "Shenzhen",
      destination: "Buenos Aires",
      category: "Otro",
      weight_kg: "1",
      volume_m3: "1",
      fob_usd: "1100",
      description: "Textiles para comprobar capital insuficiente",
    }))
      await importer
        .locator("form[data-command=cargo] [name=" + key + "]")
        .fill(value);
    await importer.getByRole("button", { name: /Publicar/ }).click();
    const link = importer.getByRole("link", { name: "Ver carga publicada" });
    await link.waitFor();
    const other = (await link.getAttribute("href")).split("/").at(-1);
    await navigate(operator, base + "/demo/operador/oportunidades/" + other);
    await operator
      .getByRole("button", { name: "Cotizar", exact: true })
      .click();
    const f = operator.locator("form.op-quote-editor");
    await f.locator("[name=estimated_days]").fill("9");
    await f.getByLabel("Transporte internacional", { exact: true }).check();
    await f.locator("[name=amount]").fill("250000");
    await f.locator("[name=working_capital_amount]").fill("500");
    await f
      .locator("[name=valid_until]")
      .fill(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    await f.locator("[name=required_documents]").fill("Packing list");
    await f
      .getByRole("button", { name: "Revisar oferta", exact: true })
      .click();
    await operator
      .getByRole("button", { name: "Enviar oferta", exact: true })
      .click();
    await operator
      .getByRole("alert")
      .filter({ hasText: /Capital insuficiente/ })
      .waitFor();
    await operator.screenshot({ path: out + "/rechazo-capital.png" });
    await navigate(operator, base + "/demo/operador/perfil");
    await operator
      .locator(
        '[data-testid=capital-breakdown][data-operations="600"][data-offers="0"][data-available="400"]',
      )
      .waitFor();
  });
  await step("solicitud de ampliacion y aprobacion parcial", async () => {
    await navigate(operator, base + "/demo/operador/perfil#capital-operativo");
    const f = operator
      .locator("form")
      .filter({ has: operator.locator("[name=total]") });
    await operator
      .locator("#capital-operativo summary")
      .filter({ hasText: "Solicitar ampliación" })
      .click();
    await f.locator("[name=total]").fill("2000");
    await f.locator("[name=documents]").first().check();
    await submit(operator, f);
    await navigate(
      admin,
      base + "/demo/admin/capacidad?id=a0000000-0000-0000-0000-000000000007",
    );
    const review = admin
      .locator("form")
      .filter({ has: admin.locator("[name=command][value=capital]") });
    await review.locator("[name=amount]").fill("1500");
    await review
      .locator("[name=reason]")
      .fill("Aprobacion parcial conforme al respaldo ficticio");
    await submit(admin, review);
    await navigate(operator, base + "/demo/operador/perfil#capital-operativo");
    const body = await operator.locator("body").innerText();
    assert.ok(body.includes("1.500,00"));
    assert.ok(body.includes("900,00"));
    await operator.screenshot({ path: out + "/ampliacion-aprobada.png" });
  });
  await step("alta individual de importador existente", async () => {
    await navigate(admin, base + "/demo/admin/importadores");
    const f = admin.locator("form").filter({
      has: admin.locator(
        '[name=id][value="a0000000-0000-0000-0000-000000000008"]',
      ),
    });
    if (await f.count()) {
      await f
        .locator("[name=reason]")
        .fill("Activacion individual de cuenta ficticia validada");
      await submit(admin, f);
    }
    await admin.screenshot({ path: out + "/importadores.png" });
  });
  await step(
    "filtro de operaciones por empresa y contexto de reclamo",
    async () => {
      await navigate(
        admin,
        base +
          "/demo/admin/operaciones?operator=a0000000-0000-0000-0000-000000000007",
      );
      await admin
        .getByRole("link", { name: /→/ })
        .filter({ hasText: /OP-/ })
        .first()
        .click();
      assert.ok(
        (await admin.locator("body").innerText()).includes(
          "Operador multirrol ficticio",
        ),
      );
      await admin.screenshot({ path: out + "/operaciones-admin.png" });
      await navigate(admin, base + "/demo/admin/reclamos");
      const f = admin
        .locator("form")
        .filter({ has: admin.locator("[name=command][value=claim]") })
        .first();
      if (await f.count()) {
        await f.locator("[name=status]").selectOption("in_progress");
        await f
          .locator("[name=reason]")
          .fill("Evidencia revisada; se solicita informacion al operador");
        await submit(admin, f);
      }
      await admin.screenshot({ path: out + "/reclamos-admin.png" });
    },
  );
  await fs.writeFile(
    out + "/ids.json",
    JSON.stringify({ cargo, operation }, null, 2),
  );
  await step("cierre desde importador y liberacion de capital", async () => {
    for (const phase of ["in_progress", "awaiting_delivery_confirmation"]) {
      await navigate(
        operator,
        base + "/demo/operador/operaciones/" + operation,
      );
      const f = operator
        .locator("form")
        .filter({ has: operator.locator("[name=phase][value=" + phase + "]") });
      await f
        .locator("[name=description]")
        .fill("Transicion acreditada para el ensayo aislado");
      await f.getByRole("button").click();
      const response = operator.waitForResponse(
        (r) => r.request().method() === "POST" && r.url().startsWith(base),
      );
      await operator
        .getByRole("button", { name: "Confirmar y continuar", exact: true })
        .click();
      await response;
      await operator.waitForTimeout(350);
    }
    await navigate(
      importer,
      base + "/demo/importador/operaciones/" + operation,
    );
    await importer
      .getByRole("button", { name: "Confirmar recepción y finalizar" })
      .click();
    await importer
      .getByTestId("operation-phase")
      .filter({ hasText: "completed" })
      .waitFor();
    await importer
      .locator("[name=comment]")
      .fill("Recorrido local verificado y entrega conforme");
    await importer.getByRole("button", { name: "Enviar evaluación" }).click();
    await importer.getByTestId("sent-rating").waitFor();
    await importer.screenshot({ path: out + "/importador-completada.png" });
    await navigate(operator, base + "/demo/operador/perfil#capital-operativo");
    assert.ok(
      (await operator.locator("body").innerText()).includes("1.500,00"),
    );
  });
} catch (e) {
  failed = e;
  results.push({ result: "FAIL", error: String(e.message).slice(0, 1600) });
  for (const [role, p] of Object.entries(pages))
    await p
      .screenshot({ path: out + "/fallo-" + role + ".png" })
      .catch(() => {});
} finally {
  await fs.writeFile(
    out + "/resultados.json",
    JSON.stringify(
      {
        base,
        environment: "Local PGlite; Auth y Storage simulados, sesiones por rol",
        results,
      },
      null,
      2,
    ),
  );
}
if (failed) {
  console.error(failed.message);
  process.exit(1);
}
process.exit(0);
