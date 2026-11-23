import { expect, type Page } from "@playwright/test";
import { PROVEEDORES } from "../../prisma/datos";

export const CONTRASENA = "Demo2026!";

/** Inicia sesión con correo y contraseña y espera la redirección a su inicio. */
export async function ingresar(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/login");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(CONTRASENA);
  await page.getByRole("button", { name: "Ingresar", exact: true }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"));
}

/** Correo del usuario demo de un proveedor a partir de su razón social. */
export function correoProveedor(razonSocial: string) {
  const p = PROVEEDORES.find((x) => razonSocial.includes(x.razonSocial) || x.razonSocial.includes(razonSocial.trim()));
  if (!p) throw new Error(`Proveedor desconocido: ${razonSocial}`);
  return p.email;
}

/** Convierte "S/ 1,234.50" en 1234.5. */
export function aNumero(texto: string | null) {
  return Number((texto ?? "").replace(/[^\d.-]/g, ""));
}

export async function esperarToast(page: Page, texto: string | RegExp) {
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: texto }).first()).toBeVisible();
}
