import { expect, test, type Page } from "@playwright/test";
import { esperarToast, ingresar } from "./utilidades";

/** Flujos del alcance ampliado (criterios 17 a 22). */
test.describe.configure({ mode: "serial" });

async function elegirOpcion(page: Page, selector: string, texto: string) {
  const valor = await page.locator(`${selector} option`, { hasText: texto }).first().getAttribute("value");
  await page.locator(selector).selectOption(valor!);
}

test("E12 · la bodega ve precios por volumen en el catálogo mayorista", async ({ page }) => {
  await ingresar(page, "rosa@bodegarosa.pe");
  await expect(page).toHaveURL(/\/comprador\/catalogo/);
  await expect(page.getByText(/\d+\+/).first()).toBeVisible();
});

test("E13 · cotización: 2 proveedores responden y la mejor se convierte en pedido", async ({ page }) => {
  test.setTimeout(240_000);
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/cotizaciones/nueva");
  await elegirOpcion(page, '[aria-label="Producto 1"]', "Café tostado molido");
  await page.getByLabel("Cantidad 1").fill("25");
  await page.locator("#titulo").fill("Café para el directorio");
  await page.getByText("Todos los homologados de la categoría").click();
  await page.locator("label", { hasText: "Cooperativa Café Selva" }).click();
  await page.locator("label", { hasText: "Distribuidora Lima Norte" }).click();
  await page.getByTestId("enviar-solicitud").click();
  await page.waitForURL(/\/comprador\/cotizaciones\/(?!nueva)[^/]+$/);
  const url = page.url();
  const codigo = (await page.locator("h1").textContent())!.split(" ·")[0];

  for (const [email, precio] of [
    ["ventas@cafeselva.pe", "36.50"],
    ["ventas@limanorte.pe", "41.00"],
  ] as const) {
    await ingresar(page, email);
    await page.goto("/proveedor/cotizaciones");
    const tarjeta = page.getByTestId(`rfq-${codigo}`);
    await tarjeta.getByTestId("responder-cotizacion").click();
    await page.getByLabel(/Precio de Café/).fill(precio);
    await page.getByLabel("Condiciones").fill("Entrega en San Isidro sin costo adicional.");
    await page.getByTestId("enviar-cotizacion").click();
    await esperarToast(page, "Cotización enviada");
  }

  await ingresar(page, "compras@andina.pe");
  await page.goto(url);
  await expect(page.getByTestId("tabla-comparativa")).toBeVisible();
  await expect(page.getByTestId("total-mejor")).toHaveText("S/ 912.50");
  await page.getByTestId("convertir-mejor").click();
  await page.waitForURL(/\/comprador\/pedidos\/[^/]+$/);
  await expect(page.getByTestId("subpedido")).toHaveCount(1);
  await expect(page.getByTestId("subpedido").locator("h3")).toHaveText(/Café Selva/);
});

test("E14 · licitación: propuestas selladas (403), ranking al cierre, adjudicación y contrato", async ({ page }) => {
  test.setTimeout(240_000);
  await ingresar(page, "compras@clinicasangabriel.pe");
  await page.goto("/comprador/licitaciones/nueva");
  await page.locator("#lic-titulo").fill("Frutas y lácteos para pacientes 2027");
  await page.locator("#lic-desc").fill("Entregas semanales de frutas y lácteos en la sede principal antes de las 7 a. m.");
  await page.locator("#lic-meses").fill("3");
  await page.locator("#lic-vol").fill("S/ 12,000 mensuales aprox.");
  await page.getByRole("button", { name: "Publicar licitación" }).click();
  await page.waitForURL(/\/comprador\/licitaciones\/(?!nueva)[^/]+$/);
  const url = page.url();
  const id = url.split("/").pop()!;
  const codigo = (await page.locator("h1").textContent())!.split(" ·")[0];

  for (const [email, monto, plazo, certs] of [
    ["ventas@lacteosmantaro.pe", "35000", "2", ["Registro sanitario DIGESA", "BPM"]],
    ["ventas@laparadaexpress.pe", "33000", "1", ["Registro sanitario DIGESA"]],
  ] as const) {
    await ingresar(page, email);
    await page.goto("/proveedor/licitaciones");
    const tarjeta = page.getByTestId(`licitacion-${codigo}`);
    await tarjeta.getByTestId("presentar-propuesta").click();
    const dialogo = page.getByRole("dialog");
    await dialogo.getByLabel("Monto total (S/)").fill(monto);
    await dialogo.getByLabel("Plazo de entrega (días)").fill(plazo);
    for (const c of certs) await dialogo.locator("label", { hasText: c }).first().click();
    await dialogo.getByLabel("Descripción").fill("Cadena de frío y entregas puntuales para instituciones de salud.");
    await page.getByTestId("enviar-propuesta").click();
    await esperarToast(page, "Propuesta enviada");
    await expect(tarjeta.getByTestId("mi-propuesta")).toBeVisible();
  }

  await ingresar(page, "compras@clinicasangabriel.pe");
  // Selladas: la API responde 403 antes del cierre
  expect((await page.request.get(`/api/licitaciones/${id}/propuestas`)).status()).toBe(403);
  await page.goto(url);
  await expect(page.getByTestId("propuestas-selladas")).toContainText("2 propuestas selladas");
  await page.getByTestId("cerrar-licitacion").click();
  await expect(page.getByTestId("propuesta")).toHaveCount(2);
  const puntajes = (await page.getByTestId("puntaje").allTextContents()).map((t) => parseFloat(t));
  expect(puntajes[0]).toBeGreaterThanOrEqual(puntajes[1]);
  expect((await page.request.get(`/api/licitaciones/${id}/propuestas`)).status()).toBe(200);
  await page.getByTestId("adjudicar-primera").click();
  await page.waitForURL("**/comprador/contratos");
  const contrato = page.locator("[data-testid^=contrato-]").first();
  await expect(contrato.getByTestId("calendario-entregas").locator("> div")).toHaveCount(13);
});

test("E15 · la página pública de un lote muestra origen, certificados, fechas y QR", async ({ page, request }) => {
  await ingresar(page, "ventas@molinodelvalle.pe");
  await page.goto("/proveedor/lotes");
  const enlace = page.locator("[data-testid^=lote-] a").first();
  const codigo = (await enlace.textContent())!.trim();
  await page.context().clearCookies();
  await page.goto(`/trazabilidad/${codigo}`);
  await expect(page.getByTestId("codigo-lote")).toHaveText(codigo);
  await expect(page.getByTestId("origen-lote")).toContainText("Molino");
  await expect(page.getByTestId("certificados-lote")).toContainText("DIGESA");
  await expect(page.getByTestId("fechas-lote")).toContainText("Vencimiento");
  await expect(page.getByTestId("qr-lote")).toHaveAttribute("src", /^data:image\/png;base64,/);
  const qr = await request.get(`/trazabilidad/${codigo}/qr`);
  expect(qr.status()).toBe(200);
  expect(qr.headers()["content-type"]).toBe("image/png");
  expect((await qr.body()).subarray(1, 4).toString()).toBe("PNG");
});

test("E16 · el consumidor compra unidades sueltas en /tienda y sigue su pedido", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/tienda");
  await page.getByTestId("agregar-tienda").nth(0).click();
  await page.getByTestId("agregar-tienda").nth(0).click();
  await expect(page.getByTestId("canasta").locator("li")).toHaveCount(2);
  await page.getByRole("link", { name: "Ingresa para pagar" }).click();
  await page.locator("#email").fill("cliente@correo.pe");
  await page.locator("#password").fill("Demo2026!");
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL("**/tienda");
  await expect(page.getByTestId("canasta").locator("li")).toHaveCount(2);
  await page.getByTestId("pagar-tienda").click();
  await page.waitForURL(/\/cuenta\/pedidos\/[^/]+$/);
  await expect(page.getByTestId("codigo-pedido")).toContainText("PED-");
  await expect(page.getByTestId("linea-tiempo")).toBeVisible();
  await page.goto("/cuenta");
  await expect(page.getByTestId("enlace-compra").first()).toBeVisible();
});

test("E17 · el asistente arma la propuesta con reglas y solo agrega al confirmar", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/asistente");
  await page.getByTestId("mensaje-asistente").fill("20 kg de arroz y 10 bidones para San Isidro el jueves");
  await page.keyboard.press("Enter");
  const propuesta = page.getByTestId("propuesta-asistente").last();
  await expect(propuesta).toContainText("Arroz extra saco 50 kg");
  await expect(propuesta).toContainText("Agua de mesa");
  await expect(propuesta).toContainText("Interpretado con reglas");
  await propuesta.getByTestId("confirmar-propuesta").click();
  await page.waitForURL(/\/comprador\/carrito/);
  await expect(page.getByTestId("item-carrito")).toHaveCount(2);
});

test("E18 · pedido recurrente editable, generación inmediata y cron", async ({ page }) => {
  await ingresar(page, "compras@andina.pe");
  await page.goto("/comprador/recurrentes");
  const rec = page.getByTestId("recurrente").first();
  await rec.getByTestId("ejecutar-ahora").click();
  await page.waitForURL(/\/comprador\/pedidos\/[^/]+$/);
  await expect(page.getByTestId("codigo-pedido")).toContainText("PED-");
  const cron = await page.request.get("/api/cron");
  expect(cron.status()).toBe(200);
  expect(await cron.json()).toMatchObject({ pedidosGenerados: expect.any(Number), licitacionesCerradas: expect.any(Number) });
});
