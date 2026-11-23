import { expect, test } from "@playwright/test";
import { aNumero, correoProveedor, esperarToast, ingresar } from "./utilidades";

/**
 * Flujos del núcleo (criterios 2 a 13 de la sección 9 del prompt).
 * Se ejecutan en orden porque el flujo principal crea datos que usan los siguientes.
 */
test.describe.configure({ mode: "serial" });

test("E01 · las 4 cuentas demo entran y cada rol ve solo su menú", async ({ page }) => {
  const casos = [
    { email: "compras@andina.pe", inicio: "/comprador", ve: "Planificador", noVe: "Homologación" },
    { email: "gerencia@andina.pe", inicio: "/comprador", ve: "Aprobaciones", noVe: "Competitividad" },
    { email: "ventas@limanorte.pe", inicio: "/proveedor", ve: "Competitividad", noVe: "Planificador" },
    { email: "admin@abastia.pe", inicio: "/admin", ve: "Proveedores", noVe: "Planificador" },
  ];
  for (const c of casos) {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.getByTestId(`demo-${c.email}`).click();
    await page.waitForURL(`**${c.inicio}`);
    const menu = page.getByRole("navigation").first();
    await expect(menu.getByRole("link", { name: c.ve }).first()).toBeVisible();
    await expect(menu.getByRole("link", { name: c.noVe })).toHaveCount(0);
  }
});

test("E02 · un proveedor no entra al área del comprador ni lee pedidos ajenos (403)", async ({ page, request }) => {
  await ingresar(page, "ventas@limanorte.pe");
  await page.goto("/comprador/pedidos");
  await expect(page).not.toHaveURL(/\/comprador/);

  // Un pedido de otra empresa por API: buscamos uno con el comprador y lo pedimos como proveedor
  await ingresar(page, "compras@saboresdelpuerto.pe");
  const lista = await page.request.get("/api/pedidos");
  const { pedidos } = await lista.json();
  const ajeno = pedidos[0].id as string;
  await ingresar(page, "compras@andina.pe");
  expect((await page.request.get(`/api/pedidos/${ajeno}`)).status()).toBe(403);
  // El proveedor solo puede ver pedidos donde tiene un subpedido aprobado
  await ingresar(page, "ventas@limanorte.pe");
  const propios = new Set(((await (await page.request.get("/api/pedidos")).json()).subpedidos as { pedidoId: string }[]).map((s) => s.pedidoId));
  const noPropio = (pedidos as { id: string }[]).find((p) => !propios.has(p.id));
  expect(noPropio).toBeTruthy();
  expect([403, 404]).toContain((await page.request.get(`/api/pedidos/${noPropio!.id}`)).status());
  // Sin sesión: 401
  expect((await request.get(`/api/pedidos/${ajeno}`)).status()).toBe(401);
});

test("E03 · catálogo: arroz con mejor oferta, promedio y ahorro; búsqueda y filtros", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/catalogo?q=arroz");
  const arroz = page.getByTestId("producto-arroz-extra-saco-50-kg");
  await expect(arroz.getByTestId("mejor-precio")).toHaveText("S/ 176.50");
  await expect(arroz.getByTestId("mejor-proveedor")).toContainText("Molino del Valle");
  await expect(arroz.getByTestId("promedio")).toHaveText("S/ 182.50");
  await expect(arroz.getByTestId("ahorro")).toContainText("3.3 %");
  await page.goto("/comprador/catalogo?categoria=bebidas");
  await expect(page.getByTestId("producto-agua-de-mesa-bidon-20-l")).toBeVisible();
  await expect(page.getByTestId("producto-arroz-extra-saco-50-kg")).toHaveCount(0);
});

test("E04 · planificador: arroz sugiere 6 con pronóstico 7.0 y recalcula a 14; pollo sin stock", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/planificador");
  const arroz = page.getByTestId("fila-arroz-extra-saco-50-kg");
  await expect(arroz.getByTestId("pronostico")).toContainText("7.0");
  await expect(arroz.getByTestId("sugerida")).toContainText("6");
  await expect(page.getByTestId("fila-pollo-entero-fresco-kg").getByTestId("nivel")).toHaveText("Sin stock");
  await page.getByTestId("personas").fill("240");
  await expect(arroz.getByTestId("sugerida")).toContainText("14");
  // En el panel también aparece el pollo sin stock
  await page.goto("/comprador");
  await expect(page.getByText("Sin stock").first()).toBeVisible();
});

test("E05 · flujo completo: planificador → carrito → pedido → aprobación → proveedores → recepción", async ({ page }) => {
  test.setTimeout(400_000);
  // 1. El comprador agrega las sugerencias y revisa el carrito
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/planificador");
  // Con 240 personas el pedido supera el monto límite de la sede (S/ 3,000)
  await page.getByTestId("personas").fill("240");
  await page.getByTestId("agregar-sugerencias").click();
  await esperarToast(page, /sugerencias agregadas/);
  await page.goto("/comprador/carrito");
  const grupos = await page.getByTestId("grupo-proveedor").count();
  expect(grupos).toBeGreaterThanOrEqual(3);
  const subtotal = aNumero(await page.getByTestId("subtotal").textContent());
  const igv = aNumero(await page.getByTestId("igv").textContent());
  const total = aNumero(await page.getByTestId("total").textContent());
  expect(Math.abs(subtotal + igv - total)).toBeLessThan(0.011);
  expect(Math.abs(igv - subtotal * 0.18)).toBeLessThan(0.02);
  await expect(page.getByTestId("aviso-aprobacion")).toBeVisible();
  await page.getByTestId("confirmar-pedido").click();
  await page.waitForURL(/\/comprador\/pedidos\/[^/]+$/);
  const urlPedido = page.url();
  const pedidoId = urlPedido.split("/").pop()!;
  await expect(page.getByTestId("estado-pedido").first()).toContainText("Pendiente de aprobación");
  await expect(page.getByTestId("subpedido")).toHaveCount(grupos);
  const razones = await page.getByTestId("subpedido").locator("h3").allTextContents();
  expect(razones).toHaveLength(grupos);

  // 2. Antes de aprobar, el proveedor no ve el pedido
  const primerProveedor = correoProveedor(razones[0]);
  await ingresar(page, primerProveedor);
  const antes = await page.request.get(`/api/pedidos/${pedidoId}`);
  expect([403, 404]).toContain(antes.status());

  // 3. El aprobador lo aprueba
  await ingresar(page, "gerencia@andina.pe");
  await page.goto("/comprador/aprobaciones");
  await expect(page.getByTestId("pedido-por-aprobar").first()).toBeVisible();
  await page.goto(urlPedido);
  await page.getByTestId("aprobar-pedido").click();
  await esperarToast(page, /aprobado/i);

  // 4. Cada proveedor avanza su subpedido por los 5 estados
  for (const razon of razones) {
    await ingresar(page, correoProveedor(razon));
    await page.goto(`/proveedor/pedidos/${pedidoId}`);
    for (let i = 0; i < 4; i++) {
      const boton = page.getByTestId("avanzar-estado");
      await expect(boton).toBeEnabled();
      await boton.click();
      await esperarToast(page, /Estado:/);
    }
    await expect(page.getByTestId("avanzar-estado")).toHaveCount(0);
  }

  // 5. El comprador ve la línea de tiempo, las notificaciones y confirma la recepción
  await ingresar(page, "compras@andina.pe");
  await page.goto(urlPedido);
  await expect(page.getByTestId("estado-pedido").first()).toContainText("Entregado");
  await expect(page.getByTestId("linea-tiempo").locator("li").first()).toBeVisible();
  await expect(page.getByTestId("campana")).toBeVisible();
  for (let i = 0; i < razones.length; i++) {
    await page.getByTestId("confirmar-recepcion").first().click();
    await page.getByTestId("estrella-5").click();
    await page.getByTestId("enviar-recepcion").click();
    await expect(page.getByTestId("recepcion-registrada")).toHaveCount(i + 1);
  }
});

test("E06 · liquidación del proveedor: S/ 1,180.00 con 6 % deja S/ 940.00 neto", async ({ page }) => {
  await ingresar(page, "ventas@limanorte.pe");
  await page.goto("/proveedor");
  const fila = page.getByTestId("fila-liquidacion").filter({ has: page.getByTestId("liq-total").getByText("S/ 1,180.00") }).first();
  await expect(fila.getByTestId("liq-neto")).toHaveText("S/ 940.00");
});

test("E07 · repetir pedido recrea el carrito", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/pedidos");
  await page.getByTestId("enlace-pedido").first().click();
  await page.getByTestId("repetir-pedido").click();
  await page.waitForURL("**/comprador/carrito");
  await expect(page.getByTestId("item-carrito").first()).toBeVisible();
});

test("E08 · panel de gasto con 6 meses y exportación CSV", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador");
  await expect(page.getByTestId("grafico-mensual")).toBeVisible();
  await expect(page.getByTestId("ahorro-acumulado")).toContainText("S/");
  const csv = await page.request.get("/api/reportes/gasto");
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toContain("text/csv");
  const texto = await csv.text();
  expect(texto.split("\n").length).toBeGreaterThan(5);
});

test("E09 · el administrador homologa al proveedor pendiente y ve H1–H5", async ({ page }) => {
  await ingresar(page, "admin@abastia.pe");
  for (const h of ["H1", "H2", "H3", "H4", "H5"]) {
    await expect(page.getByTestId(`hipotesis-${h}`)).toHaveAttribute("data-semaforo", /VERDE|AMBAR|ROJO/);
  }
  await page.goto("/admin/proveedores");
  const pendiente = page.locator("[data-testid^=proveedor-]").filter({ hasText: "Andes Express" });
  await pendiente.first().getByTestId("homologar").click();
  await expect(pendiente.first().getByTestId("estado-proveedor")).toHaveText(/Homologado/);
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/catalogo?q=quinua");
  await page.getByTestId("producto-quinua-blanca-saco-25-kg").getByRole("link").first().click();
  await expect(page.getByText("Andes Express").first()).toBeVisible();
});

test("E10 · landing: calculadora en vivo y formulario de piloto guarda el lead", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/");
  const ahorro = page.getByTestId("calc-ahorro");
  const antes = await ahorro.textContent();
  await page.locator("#calc-gasto").fill("50000");
  await expect(ahorro).not.toHaveText(antes ?? "");
  await page.locator("#nombre").fill("Ana Prueba");
  await page.locator("#empresa").fill("Prueba E2E S.A.C.");
  await page.locator("#lemail").fill("ana@pruebae2e.pe");
  await page.locator("#lpersonas").fill("80");
  await page.getByTestId("enviar-piloto").click();
  await expect(page.getByTestId("piloto-enviado")).toBeVisible();
  await ingresar(page, "admin@abastia.pe");
  await page.goto("/admin/leads");
  await expect(page.getByTestId("fila-lead").filter({ hasText: "Prueba E2E" })).toBeVisible();
});

test("E11 · PWA: manifest válido", async ({ request }) => {
  const r = await request.get("/manifest.webmanifest");
  expect(r.status()).toBe(200);
  const m = await r.json();
  expect(m.name).toContain("AbastIA");
  expect(m.display).toBe("standalone");
  expect(m.icons.some((i: { sizes: string }) => i.sizes === "512x512")).toBe(true);
});
