"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirProveedor } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { codigoPedido, ETIQUETAS_ESTADO, siguienteEstado, type EstadoSubPedido } from "@/lib/negocio";
import { esquemaRechazo } from "@/modules/pedidos/esquemas";
import { compradoresDelPedido, notificar } from "@/modules/pedidos/servicio";

function revalidar() {
  revalidatePath("/proveedor", "layout");
  revalidatePath("/comprador", "layout");
  revalidatePath("/cuenta", "layout");
}

/** Subpedido del proveedor, solo si el pedido ya fue aprobado (o no requería aprobación). */
async function subpedidoPropio(id: string, proveedorId: string) {
  const sub = await prisma.subPedido.findFirst({
    where: { id, proveedorId, pedido: { estadoAprobacion: { in: ["NO_REQUIERE", "APROBADO"] } } },
    include: { pedido: true },
  });
  if (!sub) throw new ErrorNegocio("Subpedido no encontrado");
  return sub;
}

/** Avanza el subpedido al siguiente estado: Recibido → Confirmado → En preparación → En camino → Entregado. */
export async function avanzarSubpedido(id: string): Promise<Resultado<{ estado: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const sub = await subpedidoPropio(id, usuario.proveedorId);
    const siguiente = siguienteEstado(sub.estado as EstadoSubPedido);
    if (!siguiente) throw new ErrorNegocio("Este subpedido ya no puede avanzar");
    await prisma.$transaction(async (tx) => {
      // Actualización condicional: evita avanzar dos veces si hay doble clic
      const r = await tx.subPedido.updateMany({ where: { id, estado: sub.estado }, data: { estado: siguiente } });
      if (r.count === 0) throw new ErrorNegocio("El estado cambió, recarga la página");
      const proveedor = await tx.proveedor.findUniqueOrThrow({ where: { id: usuario.proveedorId } });
      await tx.eventoEstado.create({
        data: { pedidoId: sub.pedidoId, subPedidoId: id, estado: siguiente, descripcion: `${ETIQUETAS_ESTADO[siguiente]} · ${proveedor.razonSocial}`, usuarioId: usuario.id },
      });
      const destinatarios = await compradoresDelPedido(tx, sub.pedido);
      await notificar(
        tx,
        destinatarios,
        `Pedido ${codigoPedido(sub.pedido.numero)}: ${ETIQUETAS_ESTADO[siguiente].toLowerCase()}`,
        `${proveedor.razonSocial} actualizó tu pedido a "${ETIQUETAS_ESTADO[siguiente]}".`,
        sub.pedido.empresaId ? `/comprador/pedidos/${sub.pedidoId}` : `/cuenta/pedidos/${sub.pedidoId}`,
      );
    });
    revalidar();
    return { estado: siguiente };
  }, "Estado actualizado");
}

/** Rechaza un subpedido con motivo (solo antes de prepararlo). */
export async function rechazarSubpedido(entrada: z.infer<typeof esquemaRechazo>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const { id, motivo } = esquemaRechazo.parse(entrada);
    const sub = await subpedidoPropio(id, usuario.proveedorId);
    if (!["RECIBIDO", "CONFIRMADO"].includes(sub.estado)) throw new ErrorNegocio("Solo puedes rechazar un subpedido antes de prepararlo");
    await prisma.$transaction(async (tx) => {
      await tx.subPedido.update({ where: { id }, data: { estado: "RECHAZADO", motivoRechazo: motivo } });
      // Devolvemos el stock reservado
      const items = await tx.itemPedido.findMany({ where: { subPedidoId: id } });
      for (const it of items) if (it.ofertaId) await tx.oferta.update({ where: { id: it.ofertaId }, data: { stock: { increment: it.cantidad } } });
      await tx.eventoEstado.create({ data: { pedidoId: sub.pedidoId, subPedidoId: id, estado: "RECHAZADO", descripcion: `Rechazado por el proveedor: ${motivo}`, usuarioId: usuario.id } });
      const destinatarios = await compradoresDelPedido(tx, sub.pedido);
      await notificar(tx, destinatarios, "Subpedido rechazado", `Un proveedor rechazó parte del pedido ${codigoPedido(sub.pedido.numero)}: ${motivo}`, `/comprador/pedidos/${sub.pedidoId}`);
    });
    revalidar();
  }, "Subpedido rechazado");
}

const esquemaOferta = z.object({
  id: z.string().optional(),
  productoId: z.string().min(1, "Elige un producto"),
  precio: z.coerce.number().positive("El precio debe ser mayor que cero").max(100000),
  stock: z.coerce.number().int("Debe ser entero").min(0, "No puede ser negativo"),
  pedidoMinimo: z.coerce.number().int("Debe ser entero").min(1, "Mínimo 1"),
  plazoDias: z.coerce.number().int("Debe ser entero").min(0).max(30),
  activa: z.boolean().default(true),
});

/** Crea o edita una oferta del catálogo del proveedor (guarda el historial de precios). */
export async function guardarOferta(entrada: z.input<typeof esquemaOferta>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const datos = esquemaOferta.parse(entrada);
    const producto = await prisma.producto.findUnique({ where: { id: datos.productoId } });
    if (!producto) throw new ErrorNegocio("Producto no encontrado");
    const existente = await prisma.oferta.findUnique({ where: { proveedorId_productoId: { proveedorId: usuario.proveedorId, productoId: datos.productoId } } });
    if (datos.id && existente && existente.id !== datos.id) throw new ErrorNegocio("Ya tienes una oferta para ese producto");
    const valores = { precio: datos.precio, stock: datos.stock, pedidoMinimo: datos.pedidoMinimo, plazoDias: datos.plazoDias, activa: datos.activa };
    const oferta = existente
      ? await prisma.oferta.update({ where: { id: existente.id }, data: valores })
      : await prisma.oferta.create({ data: { ...valores, proveedorId: usuario.proveedorId, productoId: datos.productoId } });
    if (!existente || Number(existente.precio) !== datos.precio) {
      await prisma.historialPrecio.create({ data: { ofertaId: oferta.id, precio: datos.precio, fecha: new Date() } });
    }
    revalidar();
  }, "Oferta guardada");
}

/**
 * Carga masiva por CSV: columnas producto (nombre o slug), precio, stock, pedido_minimo, plazo_dias.
 * Devuelve cuántas filas se guardaron y los errores por fila.
 */
export async function cargarCsv(texto: string): Promise<Resultado<{ guardadas: number; errores: string[] }>> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const lineas = texto.replace(/\r/g, "").split("\n").map((l) => l.trim()).filter(Boolean);
    if (lineas.length < 2) throw new ErrorNegocio("El CSV debe tener encabezado y al menos una fila");
    if (lineas.length > 501) throw new ErrorNegocio("Máximo 500 filas por carga");
    const separador = lineas[0].includes(";") ? ";" : ",";
    const encabezado = lineas[0].toLowerCase().split(separador).map((c) => c.trim());
    const col = (n: string) => encabezado.indexOf(n);
    if (col("producto") < 0 || col("precio") < 0 || col("stock") < 0) throw new ErrorNegocio("Encabezados requeridos: producto, precio, stock (opcionales: pedido_minimo, plazo_dias)");
    const productos = await prisma.producto.findMany({ select: { id: true, nombre: true, slug: true } });
    const errores: string[] = [];
    let guardadas = 0;
    for (let i = 1; i < lineas.length; i++) {
      const celdas = lineas[i].split(separador).map((c) => c.trim().replace(/^"|"$/g, ""));
      const nombre = celdas[col("producto")]?.toLowerCase();
      const producto = productos.find((p) => p.nombre.toLowerCase() === nombre || p.slug === nombre);
      if (!producto) {
        errores.push(`Fila ${i + 1}: producto "${celdas[col("producto")]}" no existe en el catálogo`);
        continue;
      }
      const fila = esquemaOferta.safeParse({
        productoId: producto.id,
        precio: celdas[col("precio")]?.replace(",", "."),
        stock: celdas[col("stock")],
        pedidoMinimo: col("pedido_minimo") >= 0 ? celdas[col("pedido_minimo")] || 1 : 1,
        plazoDias: col("plazo_dias") >= 0 ? celdas[col("plazo_dias")] || 1 : 1,
        activa: true,
      });
      if (!fila.success) {
        errores.push(`Fila ${i + 1}: ${fila.error.issues[0].message}`);
        continue;
      }
      const d = fila.data;
      const existente = await prisma.oferta.findUnique({ where: { proveedorId_productoId: { proveedorId: usuario.proveedorId, productoId: producto.id } } });
      const oferta = await prisma.oferta.upsert({
        where: { proveedorId_productoId: { proveedorId: usuario.proveedorId, productoId: producto.id } },
        create: { proveedorId: usuario.proveedorId, productoId: producto.id, precio: d.precio, stock: d.stock, pedidoMinimo: d.pedidoMinimo, plazoDias: d.plazoDias },
        update: { precio: d.precio, stock: d.stock, pedidoMinimo: d.pedidoMinimo, plazoDias: d.plazoDias, activa: true },
      });
      if (!existente || Number(existente.precio) !== d.precio) await prisma.historialPrecio.create({ data: { ofertaId: oferta.id, precio: d.precio, fecha: new Date() } });
      guardadas++;
    }
    revalidar();
    return { guardadas, errores };
  });
}
