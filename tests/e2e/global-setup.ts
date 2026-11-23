import { execSync } from "node:child_process";

/** Reinicia los datos de demostración antes de la corrida. */
export default function globalSetup() {
  execSync("pnpm db:seed", { stdio: "inherit" });
}
