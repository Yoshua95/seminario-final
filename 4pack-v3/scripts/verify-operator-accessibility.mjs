import { chromium } from "playwright-core";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const source = await readFile(
  process.env.AXE_SOURCE ?? ".4pack-demo/a11y/node_modules/axe-core/axe.min.js",
  "utf8",
);
const browser = await chromium.connectOverCDP("http://localhost:9222");
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const base = process.env.OPERATOR_TEST_URL ?? "http://localhost:3000";
const reports = [];
try {
  await page.goto(base + "/demo/acceso");
  await page.getByRole("button", { name: "Entrar a la demostración" }).click();
  await page.locator(".op-content").waitFor();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const section of [
      "oportunidades",
      "mis-ofertas",
      "operaciones",
      "operaciones/d0000000-0000-0000-0000-000000006291",
      "documentos",
      "historial",
      "billetera",
      "soporte",
      "perfil",
    ]) {
      await page.goto(`${base}/demo/operador/${section}`);
      await page.locator(".op-content").waitFor();
      await page.addScriptTag({ content: source });
      const result = await page.evaluate(async () =>
        window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        }),
      );
      const violations = result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      }));
      reports.push({
        section,
        width,
        violations,
        incomplete: result.incomplete.map((v) => v.id),
      });
      console.log(JSON.stringify({ section, width, violations }));
    }
  }
  await mkdir(".4pack-demo/reports", { recursive: true });
  await writeFile(
    ".4pack-demo/reports/accessibility.json",
    JSON.stringify(reports, null, 2),
  );
  assert.equal(
    reports.flatMap((r) => r.violations).length,
    0,
    "Corregir los hallazgos WCAG AA del informe",
  );
} finally {
  await context.close();
  await browser.close();
}
