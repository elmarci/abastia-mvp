"use server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa, requerirRol } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { codigoPedido, redondear2 } from "@/lib/negocio";
import { esquemaRecepcion, esquemaRechazo } from "@/modules/pedidos/esquemas";
import { avisarProveedores, notificar } from "@/modules/pedidos/servicio";

function revalidar(id?: string) {
  revalidatePath("/comprador", "layout");
  revalidatePath("/proveedor", "layout");
  revalidatePath("/cuenta", "layout");
  if (id) revalidatePath(`/comprador/pedidos/${id}`);
}

/** El aprobador aprueba un pedido pendiente: recién entonces lo ven los proveedores. */
export async function aprobarPedido(pedidoId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["APROBADOR"]);
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({ where: { id: pedidoId, empresaId: usuario.empresaId }, include: { subPedidos: true } });
      if (!pedido) throw new ErrorNegocio("Pedido no encontrado");
      if (pedido.estadoAprobacion !== "PENDIENTE") throw new ErrorNegocio("El pedido no está pendiente de aprobación");
      await tx.pedido.update({ where: { id: pedido.id }, data: { estadoAprobacion: "APROBADO", aprobadoPorId: usuario.id, aprobadoEn: new Date() } });
      await tx.eventoEstado.create({ data: { pedidoId: pedido.id, estado: "APROBADO", descripcion: `Pedido aprobado por ${usuario.nombre}`, usuarioId: usuario.id } });
      for (const s of pedido.subPedidos) {
        await tx.eventoEstado.create({ data: { pedidoId: pedido.id, subPedidoId: s.id, estado: "RECIBIDO", descripcion: "Subpedido recibido por el proveedor" } });
      }
      const codigo = codigoPedido(pedido.numero);
      await avisarProveedores(tx, pedido.id, pedido.subPedidos.map((s) => s.proveedorId), codigo);
      await notificar(tx, [pedido.creadoPorId], "Pedido aprobado", `${usuario.nombre} aprobó el pedido ${codigo}.`, `/comprador/pedidos/${pedido.id}`);
    });
    revalidar(pedidoId);
  }, "Pedido aprobado y enviado a los proveedores");
}

export async function rechazarPedido(entrada: z.infer<typeof esquemaRechazo>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["APROBADOR"]);
    const { id, motivo } = esquemaRechazo.parse(entrada);
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({ where: { id, empresaId: usuario.empresaId } });
      if (!pedido) throw new ErrorNegocio("Pedido no encontrado");
      if (pedido.estadoAprobacion !== "PENDIENTE") throw new ErrorNegocio("El pedido no está pendiente de aprobación");
      await tx.pedido.update({ where: { id }, data: { estadoAprobacion: "RECHAZADO", motivoRechazo: motivo, aprobadoPorId: usuario.id, aprobadoEn: new Date() } });
      await tx.subPedido.updateMany({ where: { pedidoId: id }, data: { estado: "CANCELADO" } });
      await tx.eventoEstado.create({ data: { pedidoId: id, estado: "RECHAZADO", descripcion: `Rechazado por ${usuario.nombre}: ${motivo}`, usuarioId: usuario.id } });
      await notificar(tx, [pedido.creadoPorId], "Pedido rechazado", `El pedido ${codigoPedido(pedido.numero)} fue rechazado: ${motivo}`, `/comprador/pedidos/${id}`);
    });
    revalidar(id);
  }, "Pedido rechazado");
}

/** El comprador cancela un pedido mientras ningún proveedor lo haya confirmado. */
export async function cancelarPedido(pedidoId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "CONSUMIDOR"]);
    await prisma.$transaction(async (tx) => {
      const pedido = await tx.pedido.findFirst({
        where: { id: pedidoId, ...(usuario.empresaId ? { empresaId: usuario.empresaId } : { creadoPorId: usuario.id }) },
        include: { subPedidos: true },
      });
      if (!pedido) throw new ErrorNegocio("Pedido no encontrado");
      if (pedido.subPedidos.some((s) => s.estado !== "RECIBIDO")) throw new ErrorNegocio("Ya hay proveedores trabajando en este pedido: no se puede cancelar");
      await tx.subPedido.updateMany({ where: { pedidoId }, data: { estado: "CANCELADO" } });
      if (pedido.estadoAprobacion === "PENDIENTE") await tx.pedido.update({ where: { id: pedidoId }, data: { estadoAprobacion: "RECHAZADO", motivoRechazo: "Cancelado por el comprador" } });
      for (const s of pedido.subPedidos) {
        await tx.eventoEstado.create({ data: { pedidoId, subPedidoId: s.id, estado: "CANCELADO", descripcion: "Cancelado por el comprador", usuarioId: usuario.id } });
      }
      const usuariosProv = await tx.usuario.findMany({ where: { proveedorId: { in: pedido.subPedidos.map((s) => s.proveedorId) } }, select: { id: true } });
      if (pedido.estadoAprobacion !== "PENDIENTE") {
        await notificar(tx, usuariosProv.map((u) => u.id), "Pedido cancelado", `El comprador canceló el pedido ${codigoPedido(pedido.numero)}.`, `/proveedor/pedidos/${pedidoId}`);
      }
    });
    revalidar(pedidoId);
  }, "Pedido cancelado");
}

/** El comprador confirma la recepción conforme (o con observación) y califica al proveedor. */
export async function confirmarRecepcion(entrada: z.infer<typeof esquemaRecepcion>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "CONSUMIDOR"]);
    const datos = esquemaRecepcion.parse(entrada);
    await prisma.$transaction(async (tx) => {
      const sub = await tx.subPedido.findFirst({
        where: { id: datos.subPedidoId, pedido: usuario.empresaId ? { empresaId: usuario.empresaId } : { creadoPorId: usuario.id } },
        include: { recepcion: true, pedido: true, proveedor: true },
      });
      if (!sub) throw new ErrorNegocio("Subpedido no encontrado");
      if (sub.estado !== "ENTREGADO") throw new ErrorNegocio("Solo puedes confirmar la recepción de un subpedido entregado");
      if (sub.recepcion) throw new ErrorNegocio("La recepción ya fue registrada");
      await tx.recepcion.create({
        data: {
          subPedidoId: sub.id,
          conforme: datos.conforme,
          tipoObservacion: datos.conforme ? null : datos.tipoObservacion,
          observacion: datos.conforme ? null : datos.observacion,
          calificacion: datos.calificacion,
          temperatura: datos.temperatura ?? null,
        },
      });
      // Actualizamos la calificación promedio del proveedor
      const n = sub.proveedor.numeroCalificaciones;
      const promedio = (Number(sub.proveedor.calificacion) * n + datos.calificacion) / (n + 1);
      await tx.proveedor.update({ where: { id: sub.proveedorId }, data: { calificacion: redondear2(promedio), numeroCalificaciones: n + 1 } });
      await tx.eventoEstado.create({
        data: {
          pedidoId: sub.pedidoId,
          subPedidoId: sub.id,
          estado: datos.conforme ? "RECEPCION_CONFORME" : "RECEPCION_OBSERVADA",
          descripcion: datos.conforme ? `Recepción conforme · ${datos.calificacion} estrellas` : `Observación: ${datos.tipoObservacion}. ${datos.observacion}`,
          usuarioId: usuario.id,
        },
      });
      const usuariosProv = await tx.usuario.findMany({ where: { proveedorId: sub.proveedorId }, select: { id: true } });
      await notificar(
        tx,
        usuariosProv.map((u) => u.id),
        datos.conforme ? "Recepción conforme" : "Recepción con observación",
        `El pedido ${codigoPedido(sub.pedido.numero)} fue calificado con ${datos.calificacion} estrellas.`,
        `/proveedor/pedidos/${sub.pedidoId}`,
      );
    });
    revalidar();
  }, "¡Gracias! Registramos la recepción");
}

/** "Repetir pedido": recrea el carrito con los mismos productos y los precios vigentes. */
export async function repetirPedido(pedidoId: string): Promise<Resultado<{ agregados: number; omitidos: number }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const pedido = await prisma.pedido.findFirst({
      where: { id: pedidoId, empresaId: usuario.empresaId },
      include: { subPedidos: { include: { items: true } } },
    });
    if (!pedido) throw new ErrorNegocio("Pedido no encontrado");
    const carrito = await prisma.carrito.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id }, update: {} });
    await prisma.itemCarrito.deleteMany({ where: { carritoId: carrito.id } });
    await prisma.carrito.update({ where: { id: carrito.id }, data: { iniciadoEn: new Date(), sedeId: pedido.sedeId } });
    let agregados = 0;
    let omitidos = 0;
    for (const s of pedido.subPedidos) {
      for (const item of s.items) {
        // Misma oferta si sigue disponible; si no, la mejor oferta vigente del producto
        let oferta = item.ofertaId ? await prisma.oferta.findFirst({ where: { id: item.ofertaId, activa: true, stock: { gt: 0 }, proveedor: { estado: "HOMOLOGADO" } } }) : null;
        if (!oferta) {
          oferta = await prisma.oferta.findFirst({ where: { productoId: item.productoId, activa: true, stock: { gt: 0 }, proveedor: { estado: "HOMOLOGADO" } }, orderBy: { precio: "asc" } });
        }
        if (!oferta) {
          omitidos++;
          continue;
        }
        await prisma.itemCarrito.upsert({
          where: { carritoId_ofertaId: { carritoId: carrito.id, ofertaId: oferta.id } },
          create: { carritoId: carrito.id, ofertaId: oferta.id, cantidad: item.cantidad },
          update: { cantidad: { increment: item.cantidad } },
        });
        agregados++;
      }
    }
    revalidar();
    return { agregados, omitidos };
  });
}
