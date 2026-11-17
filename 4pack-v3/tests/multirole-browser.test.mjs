import { chromium } from "playwright-core";
import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  writeFile,
  readFile,
  rename,
  unlink,
} from "node:fs/promises";
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { createHash } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
const require = createRequire(import.meta.url),
  port = Number(process.env.FOURPACK_TEST_PORT ?? 3002),
  base = `http://localhost:${port}`;
await mkdir(".4pack-demo", { recursive: true });
const directory = await mkdtemp(path.resolve(".4pack-demo/multirole-browser-"));
const report = { directory, checks: [], errors: [], restarts: 0 };
let server, workerPid;
const listener = () =>
  execFileSync("netstat", ["-ano"], { encoding: "utf8", windowsHide: true })
    .split(/\r?\n/)
    .find((line) =>
      new RegExp(`127\\.0\\.0\\.1:${port}\\s+.*LISTENING`).test(line),
    );
async function start() {
  if (listener())
    throw Error(`Puerto ${port} ocupado: no se toca el servidor ajeno.`);
  server = spawn(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      "dev",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.resolve("apps/web"),
      env: {
        ...process.env,
        FOURPACK_MULTIROLE_DEMO: "1",
        FOURPACK_DEMO_DIRECTORY: directory,
        FOURPACK_DIST_DIR: ".next/multirole-test",
      },
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let log = "";
  server.stdout.on("data", (d) => {
    log += d;
    report.serverOutput = (report.serverOutput ?? "") + d;
  });
  server.stderr.on("data", (d) => {
    log += d;
    report.serverOutput = (report.serverOutput ?? "") + d;
  });
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null)
      throw Error("El servidor aislado termino: " + log.slice(-1200));
    try {
      const r = await fetch(base + "/demo/acceso", {
        signal: AbortSignal.timeout(2000),
      });
      if (r.status === 200) {
        workerPid = Number(listener()?.trim().split(/\s+/).at(-1));
        report.restarts++;
        return;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw Error("El servidor no inicio: " + log.slice(-1200));
}
async function stop() {
  // PIDs belong to the server started by this script; never kill an existing listener.
  if (server?.pid) {
    try {
      process.kill(server.pid);
    } catch {}
  }
  if (workerPid) {
    try {
      process.kill(workerPid);
    } catch {}
    workerPid = undefined;
  }
  for (let i = 0; i < 50 && listener(); i++)
    await new Promise((r) => setTimeout(r, 100));
  server?.stdout.destroy();
  server?.stderr.destroy();
}
async function check(name, fn) {
  await fn();
  report.checks.push(name);
  console.log("PASS", name);
}
let browser,
  admin,
  operator,
  importer,
  cargoId,
  operationId,
  hazmatCargoId,
  evidenceBytes = Buffer.from("%PDF-1.4\nEvidencia multirrol ficticia\n");
async function login(context, role) {
  const page = await context.newPage();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page.goto(base + "/demo/acceso");
  await page.locator("[name=account]").selectOption(role);
  await page
    .getByRole("button", { name: "Entrar al ensayo multirrol" })
    .click();
  await page.waitForURL((url) => !url.pathname.endsWith("/demo/acceso"));
  return page;
}
async function replay(context, request) {
  const response = await context.request.post(request.url(), {
    headers: await request.allHeaders(),
    data: request.postDataBuffer(),
  });
  assert.equal(
    response.status(),
    200,
    response.status() === 200
      ? undefined
      : (await response.text()).slice(0, 1500),
  );
}
async function capture(page, button) {
  const request = page.waitForRequest(
    (r) => r.method() === "POST" && r.url().startsWith(base),
  );
  await button.click();
  return request;
}
async function inspect(expected) {
  const db = new PGlite(path.join(directory, "database"));
  await db.waitReady;
  try {
    if (hazmatCargoId) {
      assert.equal(
        (
          await db.query(
            "select status from public.cargo_requests where id=$1",
            [hazmatCargoId],
          )
        ).rows[0].status,
        "open",
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from public.documents where cargo_id=$1",
            [hazmatCargoId],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from public.cargo_publication_requests where cargo_id=$1",
            [hazmatCargoId],
          )
        ).rows[0].n,
        1,
      );
    }
    const row = (
      await db.query(
        "select o.phase,g.status from public.operations o join public.payment_guarantees g on g.operation_id=o.id where o.id=$1",
        [operationId],
      )
    ).rows[0];
    assert.equal(row.phase, expected === "held" ? "confirmed" : "completed");
    assert.equal(
      row.status,
      expected === "held" ? "held_simulated" : "released_simulated",
    );
    for (const table of [
      "operations",
      "payment_guarantees",
      "operation_capacity_reservations",
    ]) {
      const column = table === "operations" ? "id" : "operation_id";
      assert.equal(
        (
          await db.query(
            `select count(*)::int n from public.${table} where ${column}=$1`,
            [operationId],
          )
        ).rows[0].n,
        1,
      );
    }
    const reservation = (
      await db.query(
        "select state,working_capital_required from public.operation_capacity_reservations where operation_id=$1",
        [operationId],
      )
    ).rows[0];
    assert.equal(
      reservation.state,
      expected === "held" ? "active" : "released",
    );
    assert.equal(Number(reservation.working_capital_required), 200);
    const movements = (
      await db.query(
        "select amount,currency from public.wallet_movements where operation_id=$1",
        [operationId],
      )
    ).rows;
    assert.equal(movements.length, expected === "held" ? 0 : 1);
    if (expected !== "held") {
      assert.equal(Number(movements[0].amount), 975);
      assert.equal(movements[0].currency, "USD");
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from public.capacity_events where operation_id=$1 and action='released'",
            [operationId],
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (
          await db.query(
            "select count(*)::int n from public.ratings where operation_id=$1",
            [operationId],
          )
        ).rows[0].n,
        2,
      );
    }
    const doc = (
      await db.query(
        "select d.storage_path,b.sha256 from public.documents d join public.document_objects b on b.document_id=d.id where d.operation_id=$1",
        [operationId],
      )
    ).rows[0];
    assert.ok(doc);
    assert.deepEqual(
      await readFile(path.join(directory, "files", doc.storage_path)),
      evidenceBytes,
    );
    assert.equal(
      doc.sha256,
      createHash("sha256").update(evidenceBytes).digest("hex"),
    );
  } finally {
    await db.close();
  }
}
try {
  await start();
  browser = await chromium.launch({
    executablePath:
      process.env.BROWSER_EXECUTABLE ??
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
    headless: true,
  });
  const adminContext = await browser.newContext(),
    operatorContext = await browser.newContext(),
    importerContext = await browser.newContext();
  admin = await login(adminContext, "admin");
  operator = await login(operatorContext, "operator");
  importer = await login(importerContext, "importer");
  await check(
    "cuentas y sesiones separadas; operador pendiente y rutas protegidas",
    async () => {
      const anonymous = await browser.newContext();
      const deniedPage = await anonymous.newPage();
      await deniedPage.goto(base + "/demo/admin");
      await deniedPage.waitForURL("**/demo/acceso");
      const signed = (await importerContext.cookies()).find(
        (c) => c.name === "fourpack-multirole",
      );
      assert.ok(signed);
      await anonymous.addCookies([
        { ...signed, value: signed.value.split(".")[0] + ".tampered" },
      ]);
      await deniedPage.goto(base + "/demo/importador");
      await deniedPage.waitForURL("**/demo/acceso");
      await anonymous.close();
      await operator
        .getByRole("heading", { name: "Tu empresa está en revisión" })
        .waitFor();
      await importer.goto(base + "/admin");
      await importer.waitForURL("**/demo/importador");
      await operator.goto(base + "/demo/admin/capacidad");
      await operator.waitForURL("**/demo/operador/oportunidades");
      await admin.goto(base + "/admin");
      await admin
        .getByRole("heading", { name: "Administración del ensayo" })
        .waitFor();
    },
  );
  await check(
    "admin aprueba al operador y configura Capacity sin defaults",
    async () => {
      const article = admin.locator(
        '[data-operator-id="a0000000-0000-0000-0000-000000000007"]',
      );
      await article.locator("[name=status]").selectOption("approved");
      await article
        .getByRole("button", { name: "Guardar verificación" })
        .click();
      await article
        .getByText("Verificación administrativa guardada.")
        .waitFor();
      await article
        .getByRole("link", { name: "Configurar Capacity de esta cuenta" })
        .click();
      const form = admin
        .locator("form")
        .filter({ has: admin.locator("[name=command][value=configure]") });
      for (const [name, value] of Object.entries({
        max_operations: "1",
        max_weight_kg: "100",
        max_volume_m3: "10",
        max_per_operation: "2000",
        max_exposure: "2000",
        declared_working_capital: "500",
        approved_working_capital: "500",
        reason: "Aprobacion ficticia de ensayo multirrol",
      }))
        await form.locator(`[name=${name}]`).fill(value);
      await form.locator("[name=status]").selectOption("active");
      await form.locator("[name=operational_status]").selectOption("active");
      await form.getByRole("button", { name: "Guardar aprobacion" }).click();
      await admin
        .getByRole("status")
        .filter({ hasText: "Capacidad actualizada y auditada." })
        .waitFor();
    },
  );
  if (process.argv.includes("--hazmat"))
    await check(
      "HAZMAT web: ausencia, PDF falso, fallo real de escritura y reintento sin duplicados",
      async () => {
        await importer.goto(base + "/cargas/nueva");
        const form = importer.locator("[data-command=cargo]");
        for (const [name, value] of Object.entries({
          title: "Baterias de litio de ensayo",
          description: "Celdas nuevas para equipos",
          origin: "Shenzhen",
          destination: "Buenos Aires",
          category: "Tecnologia",
          weight_kg: "10",
          volume_m3: "1",
          fob_usd: "2000",
        }))
          await form.locator(`[name=${name}]`).fill(value);
        const file = form.locator("input[type=file]"),
          button = form.getByRole("button", {
            name: "Publicar carga",
            exact: true,
          });
        await button.click();
        assert.equal(
          await file.evaluate((el) => el.validity.valueMissing),
          true,
        );
        await file.setInputFiles({
          name: "msds.pdf",
          mimeType: "application/pdf",
          buffer: Buffer.from("NOT A PDF"),
        });
        await button.click();
        await form
          .getByRole("alert")
          .filter({ hasText: "Invalid document format" })
          .waitFor();
        assert.equal(
          await form.getByRole("link", { name: "Ver carga publicada" }).count(),
          0,
        );
        await file.setInputFiles({
          name: "msds.pdf",
          mimeType: "application/pdf",
          buffer: evidenceBytes,
        });
        const folder = path.resolve(
            directory,
            "files",
            "a0000000-0000-0000-0000-000000000002",
          ),
          backup = folder + "-test-backup";
        assert.ok(
          folder.startsWith(directory + path.sep) &&
            backup.startsWith(directory + path.sep),
        );
        // Only temporarily move a fixture inside this test's own isolated directory.
        await rename(folder, backup);
        try {
          await writeFile(folder, "storage failure fixture");
          await button.click();
          await form
            .getByRole("alert")
            .filter({ hasText: /EEXIST|ENOTDIR/ })
            .waitFor();
          assert.equal(
            await form
              .getByRole("link", { name: "Ver carga publicada" })
              .count(),
            0,
          );
        } finally {
          await unlink(folder);
          await rename(backup, folder);
        }
        await capture(importer, button);
        const link = form.getByRole("link", { name: "Ver carga publicada" });
        await link.waitFor();
        hazmatCargoId = (await link.getAttribute("href")).split("/").at(-1);
        const retryResponse = importer.waitForResponse(
          (r) => r.request().method() === "POST" && r.url().startsWith(base),
        );
        await button.click();
        assert.equal((await retryResponse).status(), 200);
        await link.click();
        await importer.waitForURL("**/demo/importador/cargas/" + hazmatCargoId);
      },
    );
  await check("importador publica carga estandar desde pantalla", async () => {
    await importer.goto(base + "/cargas/nueva");
    await importer
      .getByRole("heading", { name: "Publicar carga", exact: true })
      .waitFor();
    const form = importer.locator("[data-command=cargo]");
    for (const [name, value] of Object.entries({
      title: "Textiles multirrol de ensayo",
      description: "Prendas de algodon para la prueba local",
      origin: "Origen ficticio",
      destination: "Destino ficticio",
      category: "Textil",
      weight_kg: "10",
      volume_m3: "1",
      fob_usd: "2000",
    }))
      await form.locator(`[name=${name}]`).fill(value);
    await form
      .getByRole("button", { name: "Publicar carga", exact: true })
      .click();
    const cargoLink = form.getByRole("link", { name: "Ver carga publicada" });
    cargoId = (await cargoLink.getAttribute("href")).split("/").at(-1);
    await cargoLink.click();
    await importer.waitForURL("**/demo/importador/cargas/" + cargoId);
    assert.ok(cargoId);
  });
  await check(
    "operador cotiza sin poder adjudicar como importador",
    async () => {
      await operator.goto(base + "/demo/operador/oportunidades/" + cargoId);
      const form = operator.locator(".op-quote-editor");
      for (const [name, value] of Object.entries({
        amount: "1000",
        working_capital_amount: "200",
        estimated_days: "8",
        scope: "Transporte internacional de ensayo",
        included: "Transporte",
        excluded: "Almacenamiento",
        insurance: "Sin seguro incluido",
        payment_terms: "Garantia simulada previa",
        required_documents: "Packing list",
        responsibilities: "Operador transporta; importador aporta documentos",
        observations: "Cotizacion ficticia multirrol",
        valid_until: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      }))
        await form.locator(`[name=${name}]`).fill(value);
      await form
        .locator("[name=services][value=international_transport]")
        .check();
      await form
        .getByRole("button", { name: "Enviar Oferta Ciega", exact: true })
        .click();
      await operator.getByText(/Tu oferta está presentada y sellada/).waitFor();
      await operator.goto(base + "/demo/operador/mis-ofertas");
      assert.equal(
        await operator
          .getByRole("button", { name: "Simular adjudicación del importador" })
          .count(),
        0,
      );
    },
  );
  await check(
    "importador compara y adjudica; reintento no duplica operacion",
    async () => {
      await importer.reload();
      await importer
        .getByRole("heading", { name: "Comparar propuestas privadas" })
        .waitFor();
      await importer
        .getByText("Transporte internacional de ensayo", { exact: true })
        .waitFor();
      assert.equal(await importer.locator("[name=max_exposure]").count(), 0);
      const request = await capture(
        importer,
        importer.getByRole("button", { name: "Adjudicar oferta" }),
      );
      await importer
        .getByText("Operación creada con capacidad reservada.")
        .waitFor();
      await replay(importerContext, request);
      const operationLink = importer.getByRole("link", {
        name: "Ver operación creada",
      });
      operationId = (await operationLink.getAttribute("href"))
        .split("/")
        .at(-1);
      await operationLink.click();
      await importer.waitForURL(
        "**/demo/importador/operaciones/" + operationId,
      );
      await importer
        .locator("[data-testid=guarantee-status][data-state=pending]")
        .waitFor();
    },
  );
  await check(
    "garantia simulada explicita; hito con evidencia privada",
    async () => {
      const request = await capture(
        importer,
        importer.getByRole("button", { name: "Confirmar garantía simulada" }),
      );
      await importer
        .locator("[data-testid=guarantee-status][data-state=held_simulated]")
        .waitFor();
      await replay(importerContext, request);
      await operator.goto(
        base + "/demo/operador/documentos?operacion=" + operationId,
      );
      // Upload actual bytes through the existing local document boundary.
      const upload = operator
        .locator("form")
        .filter({ has: operator.locator("input[type=file]") })
        .first();
      await upload
        .locator("[name=document_type]")
        .selectOption("Constancia de entrega");
      await upload.locator("input[type=file]").setInputFiles({
        name: "evidencia-multirrol.pdf",
        mimeType: "application/pdf",
        buffer: evidenceBytes,
      });
      await capture(
        operator,
        upload.getByRole("button", { name: "Subir documento", exact: true }),
      );
      await operator
        .getByText("Documento guardado.", { exact: true })
        .waitFor();
      await operator.goto(base + "/demo/operador/operaciones/" + operationId);
      const milestone = operator
        .locator("section")
        .filter({
          has: operator.getByRole("heading", {
            name: "Registrar hito",
            exact: true,
          }),
        })
        .first();
      await milestone
        .locator("[name=description]")
        .fill("Recepcion multirrol con evidencia");
      const select = milestone.locator("[name=attachment_id]");
      await select.selectOption({
        label: (await select.locator("option").allTextContents()).find((t) =>
          t.includes("evidencia-multirrol.pdf"),
        ),
      });
      await milestone.getByRole("button", { name: "Publicar hito" }).click();
      await milestone
        .getByText("Cambios guardados.", { exact: true })
        .waitFor();
      await importer.reload();
      const evidence = importer.getByRole("link", {
        name: "Ver evidencia del hito",
      });
      const response = await importerContext.request.get(
        base + (await evidence.getAttribute("href")),
      );
      assert.equal(response.status(), 200);
      assert.deepEqual(await response.body(), evidenceBytes);
      const denied = await operatorContext.request.get(base + "/demo/admin");
      assert.ok(
        !(await denied.text()).includes("<h1>Administración del ensayo</h1>"),
      );
    },
  );
  await check(
    "reinicio real conserva sesion, reserva, garantia y evidencia",
    async () => {
      await Promise.all([admin.close(), operator.close(), importer.close()]);
      await stop();
      await inspect("held");
      await start();
      admin = await adminContext.newPage();
      operator = await operatorContext.newPage();
      importer = await importerContext.newPage();
      for (const page of [admin, operator, importer])
        page.on("pageerror", (e) => report.errors.push(e.message));
      await importer.goto(base + "/demo/importador/operaciones/" + operationId);
      await importer
        .locator("[data-testid=guarantee-status][data-state=held_simulated]")
        .waitFor();
      await operator.goto(base + "/demo/operador/operaciones/" + operationId);
      await operator
        .getByText("Recepcion multirrol con evidencia", { exact: true })
        .waitFor();
    },
  );
  await check(
    "operador avanza; importador confirma; cierre idempotente y evaluacion bilateral",
    async () => {
      await operator
        .getByRole("button", { name: "Marcar como en curso", exact: true })
        .click();
      await operator
        .getByRole("button", { name: "Confirmar y continuar" })
        .click();
      await operator
        .getByRole("button", {
          name: "Marcar como lista para entrega",
          exact: true,
        })
        .waitFor();
      await operator
        .getByRole("button", {
          name: "Marcar como lista para entrega",
          exact: true,
        })
        .click();
      await operator
        .getByRole("button", { name: "Confirmar y continuar" })
        .click();
      await importer.reload();
      const request = await capture(
        importer,
        importer.getByRole("button", {
          name: "Confirmar recepción y finalizar",
        }),
      );
      await importer
        .locator(
          "[data-testid=guarantee-status][data-state=released_simulated]",
        )
        .waitFor();
      await replay(importerContext, request);
      await importer
        .locator("[name=comment]")
        .fill("Evaluacion ficticia del operador");
      await importer
        .getByRole("button", { name: "Enviar evaluación", exact: true })
        .click();
      await importer.locator("[data-testid=sent-rating]").waitFor();
      await operator.reload();
      await operator
        .getByRole("heading", { name: "Evaluar al importador" })
        .waitFor();
      const rating = operator
        .locator("form")
        .filter({ has: operator.locator("[name=score]") });
      await rating
        .locator("[name=comment]")
        .fill("Evaluacion ficticia del importador");
      const ratingRequest = await capture(
        operator,
        rating.getByRole("button", { name: "Enviar evaluación al importador" }),
      );
      await operator
        .getByText("Tu evaluación del importador está registrada.")
        .waitFor();
      await replay(operatorContext, ratingRequest);
      await operator.goto(base + "/demo/operador/capacidad");
      await operator.getByText(/Operaciones: 0 \/ 1/).waitFor();
    },
  );
  await check(
    "segundo reinicio conserva un solo movimiento, liberacion y dos evaluaciones",
    async () => {
      await Promise.all([admin.close(), operator.close(), importer.close()]);
      await stop();
      await inspect("completed");
      await start();
      admin = await adminContext.newPage();
      operator = await operatorContext.newPage();
      importer = await importerContext.newPage();
      for (const page of [admin, operator, importer])
        page.on("pageerror", (e) => report.errors.push(e.message));
      await importer.goto(base + "/demo/importador/operaciones/" + operationId);
      await importer.locator("[data-testid=sent-rating]").waitFor();
      await operator.goto(base + "/demo/operador/operaciones/" + operationId);
      await operator
        .getByText("Tu evaluación del importador está registrada.")
        .waitFor();
    },
  );
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.error = error.stack;
  report.pages = {};
  for (const [role, page] of Object.entries({ admin, operator, importer })) {
    try {
      report.pages[role] = {
        url: page.url(),
        text: (await page.locator("body").innerText()).slice(-5000),
      };
      await page.screenshot({
        path: path.join(directory, role + "-failure.png"),
        fullPage: true,
      });
    } catch {}
  }
  console.error(error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  await stop();
  await writeFile(
    path.join(directory, "browser-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("Evidence:", directory);
}
