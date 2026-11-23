import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const COOKIE_SEDE = "abastia_sede";

/** Sedes de la empresa y la sede seleccionada (validada contra la empresa). */
export async function sedesYActual(empresaId: string) {
  const sedes = await prisma.sede.findMany({ where: { empresaId }, orderBy: { creadoEn: "asc" } });
  const elegida = (await cookies()).get(COOKIE_SEDE)?.value;
  const actual = sedes.find((s) => s.id === elegida) ?? sedes[0] ?? null;
  return { sedes, actual };
}
