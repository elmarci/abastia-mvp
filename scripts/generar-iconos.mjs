// Genera los íconos PNG de la PWA a partir del logo SVG usando Playwright.
// Uso: node scripts/generar-iconos.mjs
import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icono.svg", "utf8");
const enmascarable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" fill="#1F7A4D"/><g transform="translate(7.2 7.2) scale(0.7)">${svg
  .replace(/<svg[^>]*>/, "")
  .replace("</svg>", "")
  .replace('<rect width="48" height="48" rx="12" fill="#1F7A4D"/>', "")}</g></svg>`;

const salidas = [
  ["public/icons/icon-192.png", svg, 192],
  ["public/icons/icon-512.png", svg, 512],
  ["public/icons/icon-maskable-512.png", enmascarable, 512],
  ["public/icons/apple-touch-icon.png", enmascarable, 180],
  ["src/app/icon.png", svg, 64],
];

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
for (const [ruta, contenido, tamano] of salidas) {
  await pagina.setViewportSize({ width: tamano, height: tamano });
  await pagina.setContent(
    `<html><body style="margin:0;background:transparent">${contenido.replace("<svg ", `<svg width="${tamano}" height="${tamano}" `)}</body></html>`,
  );
  await pagina.screenshot({ path: ruta, omitBackground: true, clip: { x: 0, y: 0, width: tamano, height: tamano } });
}
await navegador.close();
console.log("Íconos generados");
