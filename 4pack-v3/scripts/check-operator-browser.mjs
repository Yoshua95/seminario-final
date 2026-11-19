import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const browser = await chromium.connectOverCDP("http://localhost:9222");
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
page.on("pageerror", (e) => console.log("BROWSER ERROR:", e.message));
try {
  await page.goto("http://localhost:3000/demo/acceso");
  await page.getByRole("button", { name: "Entrar a la demostración" }).click();
  await page.waitForURL("**/demo/operador/oportunidades");
  await page
    .getByRole("heading", { name: "Mesa de Licitación Ciega", exact: true })
    .waitFor({ timeout: 30000 });
  await mkdir(".4pack-demo/screenshots", { recursive: true });
  await page.screenshot({
    path: ".4pack-demo/screenshots/operador-oportunidades.png",
    fullPage: true,
  });
  console.log((await page.locator("body").innerText()).slice(0, 2400));
  console.log("URL:", page.url());
} finally {
  await context.close();
  await browser.close();
}
