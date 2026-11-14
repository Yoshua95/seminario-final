import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { createWriteStream } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
const require=createRequire(import.meta.url);
let ownedWorkerPid;
function stopOwnedServer() {
  if(ownedWorkerPid) { try { process.kill(ownedWorkerPid); } catch {} ownedWorkerPid=undefined; }
  server?.kill();
}


await mkdir(".4pack-demo", { recursive: true });
let server;
let serverLog;
if (!process.env.OPERATOR_TEST_URL) {
  const occupied = execFileSync("netstat",["-ano"],{encoding:"utf8",windowsHide:true})
    .split(/\r?\n/).some(line=>/127\.0\.0\.1:3001\s+.*LISTENING/.test(line));
  if (occupied) throw new Error("El puerto 3001 está ocupado; no se reutiliza ni termina un servidor ajeno.");
  const stream = createWriteStream(".4pack-demo/browser-test-server.log");
  serverLog = stream;
  server = spawn(
    process.execPath,
    [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3001"],
    {
      cwd: path.resolve("apps/web"),
      env: {
        ...process.env,
        FOURPACK_DIST_DIR: ".next-e2e",
        FOURPACK_DEMO_DIRECTORY: path.resolve(
          ".4pack-demo",
          "test-run-" + crypto.randomUUID(),
        ),
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.pipe(stream);
  server.stderr.pipe(stream);
  process.on("exit", () => {
    stopOwnedServer();
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error("El servidor aislado terminó antes de iniciar; revisar puerto 3001 y log.");
    try {
      const r = await fetch("http://localhost:3001/demo/acceso", {signal:AbortSignal.timeout(5000)});
      if (r.status === 200) {
        const listener = execFileSync("netstat",["-ano"],{encoding:"utf8",windowsHide:true}).split(/\r?\n/).find(line=>/127\.0\.0\.1:3001\s+.*LISTENING/.test(line));
        ownedWorkerPid=listener ? Number(listener.trim().split(/\s+/).pop()) : undefined;
        ready = true;
        break;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!ready) throw new Error("El servidor aislado de pruebas no inició.");
}
const base = process.env.OPERATOR_TEST_URL ?? "http://localhost:3001";
const browser = process.env.BROWSER_CDP_URL
  ? await chromium.connectOverCDP(process.env.BROWSER_CDP_URL)
  : await chromium.launch({
      executablePath: process.env.BROWSER_EXECUTABLE ?? "C:/Program Files/Google/Chrome/Application/chrome.exe",
      headless: true,
    });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const screenshots = ".4pack-demo/screenshots";
await mkdir(screenshots, { recursive: true });
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log("✓", name);
}
async function navigate(path) {
  await page.goto(base + path);
  await page.locator(".op-content").waitFor();
}
try {
  await check("ruta productiva protegida sin sesión", async () => {
    await page.goto(base + "/operador/oportunidades");
    assert.match(page.url(), /\/acceso/);
  });
  await check("entrada aislada y mesa oscura renderizada", async () => {
    await page.goto(base + "/demo/acceso");
    await page
      .getByRole("button", { name: "Entrar a la demostración" })
      .click();
    await page
      .getByRole("heading", { name: "Mesa de Licitación Ciega", exact: true })
      .waitFor();
    assert.equal(await page.locator(".op-cargo-row").count(), 4);
    assert.equal(
      await page
        .locator(".op-sidebar")
        .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
      256,
    );
    await page.screenshot({
      path: screenshots + "/mesa-desktop.png",
      fullPage: true,
    });
  });
  await check("selección de carga usa una URL real", async () => {
    await page.locator(".op-cargo-row").filter({ hasText: "#LC-5512" }).click();
    await page.waitForURL(
      "**/oportunidades/b0000000-0000-0000-0000-000000005512",
    );
    await page.reload();
    assert.ok(
      (await page.locator(".op-manifest").innerText()).includes("Guangzhou"),
    );
  });
  await check(
    "filtros de oportunidades por categoría, modalidad, peso y búsqueda",
    async () => {
      for (const [query, expected] of [
        ["q=LC-5512", 1],
        ["mode=sea", 2],
        ["hazmat=yes", 2],
        ["minWeight=1000", 1],
        ["maxWeight=50", 1],
        ["category=Indumentaria%20y%20Textil", 1],
        ["q=SinCoincidencias", 0],
      ]) {
        await navigate(`/demo/operador/oportunidades?${query}`);
        assert.equal(
          await page.locator(".op-cargo-row").count(),
          expected,
          query,
        );
      }
      await navigate(
        "/demo/operador/oportunidades/b0000000-0000-0000-0000-000000005512",
      );
      const form = page.locator(".op-quote form");
      await form.locator("[name=amount]").fill("-1");
      await form.locator("[name=days]").fill("0");
      assert.equal(await form.evaluate((f) => f.checkValidity()), false);
    },
  );
  await check("oferta confirmada, sellada y persistente", async () => {
    const form = page.locator(".op-quote form");
    await form.locator("[name=amount]").fill("785.50");
    await form.locator("[name=days]").fill("12");
    await form.locator(".op-offer-conditions summary").click();
    await form
      .locator("[name=terms]")
      .fill("Retiro y entrega internacional de prueba.");
    await form
      .locator("[name=documentation]")
      .fill("Packing list y factura comercial");
    await form.getByRole("button", { name: "Enviar Oferta Ciega" }).click();
    await page.getByRole("dialog").waitFor();
    await page.getByRole("button", { name: "Confirmar y continuar" }).click();
    await page
      .getByText("Tu oferta está presentada y sellada.", { exact: false })
      .waitFor();
    await page.reload();
    await page
      .getByText("Tu oferta está presentada y sellada.", { exact: false })
      .waitFor();
    await navigate("/demo/operador/mis-ofertas");
    assert.ok(
      (
        await page
          .locator(".op-offer-card")
          .filter({ hasText: "#LC-5512" })
          .innerText()
      ).includes("785,50"),
    );
  });
  await check("adjudicación de demo genera operación y garantía", async () => {
    const card = page.locator(".op-offer-card").filter({ hasText: "#LC-5512" });
    await card
      .getByRole("button", { name: "Simular adjudicación del importador" })
      .click();
    await page.getByRole("button", { name: "Confirmar y continuar" }).click();
    await card.getByRole("link", { name: "Ver operación" }).waitFor();
    await page.reload();
    await page
      .locator(".op-offer-card")
      .filter({ hasText: "#LC-5512" })
      .getByRole("link", { name: "Ver operación" })
      .click();
    await page
      .getByRole("heading", { name: "Línea de tiempo de la operación" })
      .waitFor();
    assert.ok(
      (await page.locator(".op-page-header").innerText()).includes("Confirmada"),
    );
  });
  await check("hito y mensaje conservados al recargar", async () => {
    const section = page
      .locator("section")
      .filter({
        has: page.getByRole("heading", { name: "Registrar hito", exact: true }),
      })
      .first();
    await section
      .locator("[name=description]")
      .fill("Comprobación funcional de persistencia.");
    await section.getByRole("button", { name: "Publicar hito" }).click();
    await section.getByText("Cambios guardados.", { exact: true }).waitFor();
    const chat = page.locator(".op-chat");
    await chat
      .locator("[name=body]")
      .fill("Mensaje E2E persistente desde la web.");
    await chat.getByRole("button", { name: "Enviar mensaje" }).click();
    await chat
      .getByText("Mensaje E2E persistente desde la web.", { exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByText("Mensaje E2E persistente desde la web.", { exact: true })
      .waitFor();
    await page
      .getByText("Comprobación funcional de persistencia.", { exact: true })
      .waitFor();
  });
  await check(
    "transición de operación, resumen y filtros de estado",
    async () => {
      await navigate(
        "/demo/operador/operaciones/d0000000-0000-0000-0000-000000006291",
      );
      await page
        .getByRole("button", {
          name: "Marcar como lista para entrega",
          exact: true,
        })
        .click();
      await page.getByRole("button", { name: "Confirmar y continuar" }).click();
      // Importer confirmation replaces the old operator-owned completion step.
      await page.getByText("Esperando confirmación de entrega", { exact: true }).first().waitFor();
      assert.equal(await page.getByRole("button", { name: "Marcar como completada", exact: true }).count(),0);
      await page.reload();
      assert.match(
        await page.locator(".op-page-header").innerText(),
        /OP-\d{4,}/,
      );
      assert.match(
        await page.locator(".op-operation-layout").innerText(),
        /\+54 11 5555-0100/,
      );
      await navigate("/demo/operador/operaciones?estado=awaiting_delivery_confirmation");
      assert.equal(await page.locator(".op-operation-row").count(), 1);
      assert.equal(await page.locator(".op-summary-grid .op-panel").count(), 3);
      await navigate("/demo/operador/operaciones?estado=disputed");
      assert.equal(await page.locator(".op-operation-row").count(), 0);
    },
  );
  await check("documento subido, listado y descargable", async () => {
    await navigate("/demo/operador/documentos");
    await page.locator("select[name=target_type]").selectOption("operator");
    await page.locator("select[name=document_type]").selectOption("MSDS");
    await page.locator("input[type=file]").setInputFiles({
      name: "msds-e2e.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF"),
    });
    await page
      .getByRole("button", { name: "Subir documento", exact: true })
      .click();
    await page.getByText("Documento guardado.", { exact: true }).waitFor();
    await page.reload();
    const row = page
      .locator(".op-document-row")
      .filter({ hasText: "msds-e2e.pdf" });
    await row.getByRole("button", { name: "Abrir documento" }).click();
    const link = row.getByRole("link", { name: "Ver msds-e2e.pdf" });
    await link.waitFor();
    const response = await context.request.get(
      new URL(await link.getAttribute("href"), base).href,
    );
    assert.equal(response.status(), 200);
    assert.equal(response.headers()["content-type"], "application/pdf");
  });
  await check(
    "reemplazo conserva historial documental y códigos legibles",
    async () => {
      await page
        .locator(".op-document-row")
        .filter({ hasText: "msds-e2e.pdf" })
        .getByRole("link", { name: "Reemplazar", exact: true })
        .click();
      await page
        .getByRole("heading", { name: "Reemplazar documento", exact: true })
        .waitFor();
      assert.notEqual(
        await page.locator("input[name=replaces_id]").inputValue(),
        "",
      );
      await page
        .locator("input[type=file]")
        .setInputFiles({
          name: "msds-v2.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("%PDF-1.4\n%%EOF"),
        });
      await page
        .getByRole("button", { name: "Subir documento", exact: true })
        .click();
      await page.getByText("Documento guardado.", { exact: true }).waitFor();
      const row = page
        .locator(".op-document-row")
        .filter({ hasText: "msds-v2.pdf" });
      await row
        .getByText("Historial de versiones (2)", { exact: true })
        .click();
      assert.match(await row.innerText(), /DOC-\d{4,}/);
      assert.match(await row.innerText(), /msds-e2e.pdf/);
      assert.match(await row.innerText(), /Responsable: Martín Rivera/);
    },
  );
  await check("historial y billetera simulada", async () => {
    await navigate("/demo/operador/historial");
    assert.ok(
      (await page.locator(".op-rank-card").innerText()).includes("Platinum"),
    );
    await page.screenshot({
      path: screenshots + "/historial-desktop.png",
      fullPage: true,
    });
    await navigate("/demo/operador/billetera");
    await page.getByText("Solicitar retiro", { exact: true }).click();
    await page.locator("input[name=amount]").fill("10");
    await page
      .getByRole("button", { name: "Solicitar retiro simulado", exact: true })
      .click();
    await page.getByRole("button", { name: "Confirmar y continuar" }).click();
    await page
      .getByText("Solicitud simulada registrada.", { exact: false })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Solicitudes de retiro simuladas" })
      .waitFor();
    await page.screenshot({
      path: screenshots + "/billetera-desktop.png",
      fullPage: true,
    });
  });
  await check("ticket de soporte persistente", async () => {
    await navigate("/demo/operador/soporte");
    await page.getByText("Crear un ticket de soporte", { exact: true }).click();
    await page.locator("[name=subject]").fill("Consulta funcional E2E");
    await page
      .locator("[name=body]")
      .first()
      .fill("Necesito confirmar el estado de mi documentación.");
    await page
      .getByRole("button", { name: "Crear ticket", exact: true })
      .click();
    await page.getByText("Cambios guardados.", { exact: true }).waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Consulta funcional E2E", exact: true })
      .waitFor();
    await page.screenshot({
      path: screenshots + "/soporte-desktop.png",
      fullPage: true,
    });
  });
  await check("ticket admite mensaje y adjunto privado opcional", async () => {
    assert.match(
      await page.locator(".op-ticket-list").innerText(),
      /TKT-\d{4,}/,
    );
    await page
      .locator("#support-message")
      .fill("Mensaje adicional para la revisión.");
    await page
      .getByRole("button", { name: "Enviar mensaje", exact: true })
      .click();
    await page
      .getByText("Mensaje adicional para la revisión.", { exact: true })
      .waitFor();
    await page
      .getByText("Adjuntar un archivo (opcional)", { exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "soporte-e2e.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\n%%EOF"),
      });
    await page
      .getByRole("button", { name: "Adjuntar al ticket", exact: true })
      .click();
    await page.getByText("Documento guardado.", { exact: true }).waitFor();
    await page.reload();
    await page.getByText(/DOC-\d+ · soporte-e2e.pdf/).waitFor();
  });
  await check(
    "perfil empresarial guarda sin exponer campos privilegiados",
    async () => {
      await navigate("/demo/operador/perfil");
      assert.equal(
        await page.locator("[name=tax_id]").getAttribute("readonly"),
        "",
      );
      assert.equal(
        await page.locator("[name=company_name]").getAttribute("readonly"),
        "",
      );
      await page
        .getByRole("heading", { name: "Checklist documental", exact: true })
        .waitFor();
      assert.equal(
        await page
          .locator("[name=role],[name=rating],[name=verification_status]")
          .count(),
        0,
      );
      await page.locator("[name=trade_name]").fill("Rivera Logistics · E2E");
      await page
        .getByRole("button", { name: "Guardar cambios", exact: true })
        .click();
      await page.getByText("Cambios guardados.", { exact: true }).waitFor();
      await page.reload();
      assert.equal(
        await page.locator("[name=trade_name]").inputValue(),
        "Rivera Logistics · E2E",
      );
    },
  );
  await check("responsive a 390 px y menú accesible", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await navigate("/demo/operador/oportunidades");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "Abrir navegación" }).click();
    await page.locator(".op-sidebar.is-open").waitFor();
    await page.getByRole("link", { name: "Mi Billetera", exact: true }).click();
    await page
      .getByRole("heading", { name: "Control de Capital y Garantías" })
      .waitFor();
    await page.screenshot({
      path: screenshots + "/billetera-mobile.png",
      fullPage: true,
    });
  });
  await check(
    "todas las secciones sin overflow y campos con nombres accesibles",
    async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const section of [
          "oportunidades",
          "mis-ofertas",
          "operaciones",
          "documentos",
          "historial",
          "billetera",
          "soporte",
          "perfil",
        ]) {
          await navigate(`/demo/operador/${section}`);
          assert.ok(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            `${section} a ${width}px`,
          );
          const unlabeled = await page
            .locator("input:not([type=hidden]),select,textarea")
            .evaluateAll((els) =>
              els
                .filter(
                  (el) =>
                    !el.labels?.length &&
                    !el.getAttribute("aria-label") &&
                    !el.getAttribute("aria-labelledby"),
                )
                .map((el) => el.outerHTML),
            );
          assert.deepEqual(unlabeled, [], section);
          assert.doesNotMatch(
            await page.locator(".op-content").innerText(),
            /\b(seed|UUID|mock|fixture|d0000000|e0000000)\b/i,
          );
        }
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Abrir navegación" }).click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page
          .getByRole("button", { name: "Abrir navegación" })
          .getAttribute("aria-expanded"),
        "false",
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Abrir navegación" })
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check(
    "pendiente y suspendido pierden el acceso operativo",
    async () => {
      for (const scenario of ["pending", "suspended"]) {
        await page.goto(base + "/demo/acceso");
        await page.locator("select[name=scenario]").selectOption(scenario);
        await page
          .getByRole("button", { name: "Entrar a la demostración" })
          .click();
        await page
          .getByRole("heading", { name: "Estado de tu cuenta", exact: true })
          .waitFor();
        assert.equal(await page.locator(".op-cargo-row").count(), 0);
        for (const path of [
          "oportunidades/b0000000-0000-0000-0000-000000009477",
          "mis-ofertas",
          "operaciones/d0000000-0000-0000-0000-000000006291",
          "billetera",
          "historial",
        ]) {
          await navigate(`/demo/operador/${path}`);
          await page
            .getByRole("heading", { name: "Estado de tu cuenta", exact: true })
            .waitFor();
        }
        if (scenario === "suspended") {
          assert.match(
            await page.locator(".op-suspended").innerText(),
            /Fecha de suspensión/,
          );
          assert.match(
            await page.locator(".op-suspended").innerText(),
            /credencial.*vencida/i,
          );
          await page.screenshot({
            path: screenshots + "/suspendido-mobile.png",
            fullPage: true,
          });
        }
      }
      await page.goto(base + "/demo/acceso");
      await page.locator("select[name=scenario]").selectOption("operator");
      await page
        .getByRole("button", { name: "Entrar a la demostración" })
        .click();
      await page
        .getByRole("heading", { name: "Mesa de Licitación Ciega", exact: true })
        .waitFor();
    },
  );
  assert.deepEqual(errors, [], "No debe haber excepciones de JavaScript");
  console.log(
    `${passed} recorridos de navegador aprobados; capturas en ${screenshots}.`,
  );
} catch (error) {
  console.log(
    "PÁGINA AL FALLAR:",
    (await page.locator("body").innerText({timeout:2000}).catch(()=>"Página no disponible")).slice(-3500),
  );
  await page.screenshot({
    path: screenshots + "/error-e2e.png",
    fullPage: true,
  });
  throw error;
} finally {
  console.log("Closing browser context");
  await context.close();
  console.log("Closing browser");
  await browser.close({ reason: "Pruebas finalizadas" });
  if (server?.pid) {
    stopOwnedServer();
    server.stdout?.destroy();
    server.stderr?.destroy();
    serverLog?.end();
  }
}
