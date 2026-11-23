"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";

const esquemaSede = z.object({
  id: z.string().optional(),
  nombre: z.string().trim().min(2, "Ingresa el nombre"),
  direccion: z.string().trim().min(5, "Ingresa la dirección"),
  distrito: z.string().min(2, "Elige el distrito"),
  personas: z.coerce.number().int("Debe ser entero").min(1, "Mínimo 1 persona").max(20000),
  montoLimiteAprobacion: z.coerce.number().min(0, "No puede ser negativo").max(10000000),
});

/** Crea o edita una sede de la empresa del usuario. */
export async function guardarSede(entrada: z.input<typeof esquemaSede>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const d = esquemaSede.parse(entrada);
    if (d.id) {
      const sede = await prisma.sede.findFirst({ where: { id: d.id, empresaId: usuario.empresaId } });
      if (!sede) throw new ErrorNegocio("Sede no encontrada");
      // Solo el aprobador puede cambiar el monto límite de aprobación
      const monto = usuario.rol === "APROBADOR" ? d.montoLimiteAprobacion : sede.montoLimiteAprobacion;
      await prisma.sede.update({ where: { id: sede.id }, data: { nombre: d.nombre, direccion: d.direccion, distrito: d.distrito, personas: d.personas, montoLimiteAprobacion: monto } });
    } else {
      await prisma.sede.create({ data: { empresaId: usuario.empresaId, nombre: d.nombre, direccion: d.direccion, distrito: d.distrito, personas: d.personas, personasBase: d.personas, montoLimiteAprobacion: d.montoLimiteAprobacion } });
    }
    revalidatePath("/comprador", "layout");
  }, "Sede guardada");
}
