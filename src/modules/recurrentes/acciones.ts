"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { hoyEnLima, sumarDias } from "@/lib/negocio";
import { esquemaCantidad } from "@/modules/pedidos/esquemas";
import { DIAS_FRECUENCIA, ejecutarRecurrente } from "@/modules/recurrentes/servicio";

const frecuencia = z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]);

const esquemaDesdePedido = z.object({ pedidoId: z.string().min(1), nombre: z.string().trim().min(3, "Ponle un nombre").max(80), frecuencia });

const esquemaEdicion = z.object({
  id: z.string().min(1),
  nombre: z.string().trim().min(3).max(80),
  frecuencia,
  proximaEjecucion: z.string().refine((v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && v > hoyEnLima(), "La próxima ejecución debe ser una fecha futura"),
  activo: z.boolean(),
  items: z.array(z.object({ ofertaId: z.string().min(1), cantidad: esquemaCantidad })).min(1, "Deja al menos un producto"),
});

function revalidar() {
  revalidatePath("/comprador/recurrentes");
  revalidatePath("/comprador", "layout");
}

/** Crea un pedido recurrente a partir de un pedido anterior. */
export async function crearRecurrenteDesdePedido(entrada: z.infer<typeof esquemaDesdePedido>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const d = esquemaDesdePedido.parse(entrada);
    const pedido = await prisma.pedido.findFirst({ where: { id: d.pedidoId, empresaId: usuario.empresaId }, include: { subPedidos: { include: { items: true } } } });
    if (!pedido || !pedido.sedeId) throw new ErrorNegocio("Pedido no encontrado");
    const items = pedido.subPedidos.flatMap((s) => s.items.filter((i) => i.ofertaId).map((i) => ({ ofertaId: i.ofertaId!, cantidad: i.cantidad })));
    if (items.length === 0) throw new ErrorNegocio("El pedido no tiene productos del catálogo");
    await prisma.pedidoRecurrente.create({
      data: {
        empresaId: usuario.empresaId,
        sedeId: pedido.sedeId,
        creadoPorId: usuario.id,
        nombre: d.nombre,
        frecuencia: d.frecuencia,
        proximaEjecucion: new Date(`${sumarDias(hoyEnLima(), DIAS_FRECUENCIA[d.frecuencia])}T00:00:00Z`),
        items,
      },
    });
    revalidar();
  }, "Pedido recurrente creado");
}

/** Edita cantidades, frecuencia y fecha antes de la próxima ejecución. */
export async function actualizarRecurrente(entrada: z.infer<typeof esquemaEdicion>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const d = esquemaEdicion.parse(entrada);
    const r = await prisma.pedidoRecurrente.updateMany({
      where: { id: d.id, empresaId: usuario.empresaId },
      data: { nombre: d.nombre, frecuencia: d.frecuencia, proximaEjecucion: new Date(`${d.proximaEjecucion}T00:00:00Z`), activo: d.activo, items: d.items },
    });
    if (r.count === 0) throw new ErrorNegocio("Pedido recurrente no encontrado");
    revalidar();
  }, "Cambios guardados");
}

/** Genera el pedido de inmediato (además del cron diario). */
export async function ejecutarRecurrenteAhora(id: string): Promise<Resultado<{ id: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const rec = await prisma.pedidoRecurrente.findFirst({ where: { id, empresaId: usuario.empresaId } });
    if (!rec) throw new ErrorNegocio("Pedido recurrente no encontrado");
    const pedido = await ejecutarRecurrente(rec);
    if (!pedido) throw new ErrorNegocio("Ninguna oferta del recurrente está disponible");
    revalidar();
    return { id: pedido.id };
  }, "Pedido generado");
}

export async function eliminarRecurrente(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    await prisma.pedidoRecurrente.deleteMany({ where: { id, empresaId: usuario.empresaId } });
    revalidar();
  }, "Pedido recurrente eliminado");
}
