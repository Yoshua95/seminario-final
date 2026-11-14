import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const browser = await chromium.connectOverCDP("http://localhost:9222");
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
await mkdir(".4pack-demo/reference", { recursive: true });
try {
  await page.goto("https://web-logistica-panel-de-mesa-de-lici.vercel.app/");
  for (const [name, file] of [
    ["Cargas Disponibles", "mesa"],
    ["Mis Ofertas", "ofertas"],
    ["Historial", "historial"],
    ["Mi Billetera", "billetera"],
    ["Soporte", "soporte"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.screenshot({
      path: `.4pack-demo/reference/${file}-1440.png`,
      fullPage: true,
    });
  }
  console.log(
    "Referencia:",
    await page.locator("h1").evaluate((el) => ({
      font: getComputedStyle(el).fontFamily,
      size: getComputedStyle(el).fontSize,
      background: getComputedStyle(document.body).backgroundColor,
    })),
  );
  await page.goto("http://localhost:3000/demo/acceso");
  await page.getByRole("button", { name: "Entrar a la demostración" }).click();
  await page.waitForURL("**/demo/operador/oportunidades");
  await page.locator(".op-content").waitFor();
  for (const [section, file] of [
    ["oportunidades", "mesa"],
    ["mis-ofertas", "ofertas"],
    ["historial", "historial"],
    ["billetera", "billetera"],
    ["soporte", "soporte"],
    ["documentos", "documentos"],
    ["perfil", "perfil"],
  ]) {
    await page.goto("http://localhost:3000/demo/operador/" + section);
    await page.locator(".op-content").waitFor();
    await page.screenshot({
      path: `.4pack-demo/screenshots/${file}-1440-final.png`,
      fullPage: true,
    });
    console.log(section, await page.locator("h1").innerText());
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/demo/operador/oportunidades");
  await page.locator(".op-content").waitFor();
  await page.screenshot({
    path: ".4pack-demo/screenshots/mesa-390-final.png",
    fullPage: true,
  });
  console.log(
    "Responsive:",
    await page.evaluate(() => ({
      viewport: innerWidth,
      contenido: document.documentElement.scrollWidth,
    })),
  );
} finally {
  await context.close();
  await browser.close();
}
