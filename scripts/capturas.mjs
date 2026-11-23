/**
 * Genera capturas a 375 px y 1440 px en docs/capturas/ y verifica que no haya
 * desplazamiento horizontal. Requiere la app corriendo (pnpm start) con la semilla.
 * Uso: node scripts/capturas.mjs [http://localhost:3000]
 */
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("@playwright/test");
const BASE = process.argv[2] ?? "http://localhost:3000";
const SALIDA = path.join(process.cwd(), "docs", "capturas");

const PAGINAS = [
  { nombre: "01-landing", ruta: "/", usuario: null },
  { nombre: "02-login", ruta: "/login", usuario: null },
  { nombre: "03-panel-gasto", ruta: "/comprador", usuario: "compras@andina.pe" },
  { nombre: "04-catalogo", ruta: "/comprador/catalogo", usuario: "compras@andina.pe" },
  { nombre: "05-planificador", ruta: "/comprador/planificador", usuario: "compras@andina.pe" },
  { nombre: "06-pedidos", ruta: "/comprador/pedidos", usuario: "gerencia@andina.pe" },
  { nombre: "07-proveedor", ruta: "/proveedor", usuario: "ventas@limanorte.pe" },
  { nombre: "08-admin-hipotesis", ruta: "/admin", usuario: "admin@abastia.pe" },
  { nombre: "09-licitacion", ruta: "/comprador/licitaciones", usuario: "compras@clinicasangabriel.pe" },
  { nombre: "10-tienda", ruta: "/tienda", usuario: null },
];

const navegador = await chromium.launch();
let problemas = 0;
for (const [ancho, alto, escala] of [
  [1440, 900, 1],
  [375, 812, 2],
]) {
  const contexto = await navegador.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: escala, locale: "es-PE", timezoneId: "America/Lima", colorScheme: "light" });
  const pagina = await contexto.newPage();
  let actual = null;
  for (const p of PAGINAS) {
    if (p.usuario !== actual) {
      await contexto.clearCookies();
      if (p.usuario) {
        await pagina.goto(`${BASE}/login`);
        await pagina.fill("#email", p.usuario);
        await pagina.fill("#password", "Demo2026!");
        await pagina.getByRole("button", { name: "Ingresar", exact: true }).click();
        await pagina.waitForURL((u) => !u.pathname.startsWith("/login"));
      }
      actual = p.usuario;
    }
    await pagina.goto(`${BASE}${p.ruta}`, { waitUntil: "networkidle" });
    await pagina.waitForTimeout(600);
    const desborde = await pagina.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (desborde > 1) {
      problemas++;
      console.warn(`⚠️  ${p.ruta} a ${ancho}px desborda ${desborde}px`);
    }
    const archivo = path.join(SALIDA, `${p.nombre}-${ancho}.png`);
    await pagina.screenshot({ path: archivo, fullPage: ancho === 375 ? false : false });
    console.log("📸", path.relative(process.cwd(), archivo));
  }
  await contexto.close();
}
await navegador.close();
if (problemas > 0) process.exitCode = 1;
