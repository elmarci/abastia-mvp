"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirRol } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { COMISION_MAXIMA, COMISION_MINIMA } from "@/lib/negocio";
import { notificar } from "@/modules/pedidos/servicio";

function revalidar() {
  revalidatePath("/admin", "layout");
  revalidatePath("/comprador", "layout");
}

/** Homologa a un proveedor: desde ese momento sus ofertas aparecen en el catálogo. */
export async function homologarProveedor(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    await requerirRol(["ADMIN"]);
    const p = await prisma.proveedor.update({ where: { id }, data: { estado: "HOMOLOGADO", homologadoEn: new Date() } });
    const usuarios = await prisma.usuario.findMany({ where: { proveedorId: id }, select: { id: true } });
    await notificar(prisma, usuarios.map((u) => u.id), "¡Fuiste homologado!", `${p.razonSocial} ya aparece en el catálogo de AbastIA.`, "/proveedor");
    revalidar();
  }, "Proveedor homologado: ya aparece en el catálogo");
}

export async function suspenderProveedor(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    await requerirRol(["ADMIN"]);
    await prisma.proveedor.update({ where: { id }, data: { estado: "SUSPENDIDO" } });
    revalidar();
  }, "Proveedor suspendido: sus ofertas dejaron de mostrarse");
}

const esquemaComision = z.object({
  id: z.string().min(1),
  porcentaje: z.coerce
    .number()
    .min(COMISION_MINIMA * 100, "La comisión mínima es 5 %")
    .max(COMISION_MAXIMA * 100, "La comisión máxima es 8 %"),
});

/** Configura la comisión del proveedor (5 % a 8 %). Aplica a pedidos nuevos. */
export async function cambiarComision(entrada: { id: string; porcentaje: number }): Promise<Resultado> {
  return ejecutar(async () => {
    await requerirRol(["ADMIN"]);
    const { id, porcentaje } = esquemaComision.parse(entrada);
    const p = await prisma.proveedor.findUnique({ where: { id } });
    if (!p) throw new ErrorNegocio("Proveedor no encontrado");
    await prisma.proveedor.update({ where: { id }, data: { comision: Math.round(porcentaje * 100) / 10000 } });
    revalidar();
  }, "Comisión actualizada");
}
