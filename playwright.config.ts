import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas extremo a extremo. Antes de correr se reinicia la semilla (global-setup)
 * para que los datos de demostración sean siempre los mismos.
 * Por defecto levanta la app compilada (`pnpm build` previo) en el puerto 3100.
 */
const PUERTO = Number(process.env.PUERTO_E2E ?? 3100);

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    locale: "es-PE",
    timezoneId: "America/Lima",
    trace: "off",
    ...devices["Desktop Chrome"],
    viewport: { width: 1440, height: 900 },
  },
  webServer: {
    command: `pnpm start -p ${PUERTO}`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
