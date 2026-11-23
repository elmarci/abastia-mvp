"use server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ejecutar, type Resultado } from "@/lib/acciones";
import { esquemaLead } from "@/modules/landing/esquemas";

/** Guarda la solicitud de piloto gratuito de 30 días. */
export async function solicitarPiloto(entrada: z.input<typeof esquemaLead>): Promise<Resultado> {
  return ejecutar(async () => {
    const d = esquemaLead.parse(entrada);
    await prisma.lead.create({ data: { ...d, email: d.email.toLowerCase(), telefono: d.telefono || null, mensaje: d.mensaje || null } });
  }, "¡Listo! Te contactaremos en menos de 24 horas para iniciar tu piloto.");
}
