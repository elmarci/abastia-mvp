import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { codigoPedido, competitividad, liquidacionDetallada, mejorOferta } from "@/lib/negocio";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";

const APROBADO = { estadoAprobacion: { in: ["NO_REQUIERE" as const, "APROBADO" as const] } };

/** Subpedidos del proveedor (solo de pedidos aprobados o que no requerían aprobación). */
export async function subpedidosProveedor(proveedorId: string, filtro?: { estado?: string }) {
  const subs = await prisma.subPedido.findMany({
    where: { proveedorId, pedido: APROBADO, ...(filtro?.estado ? { estado: filtro.estado as never } : {}) },
    include: {
      pedido: { include: { empresa: { select: { razonSocial: true } }, sede: { select: { nombre: true, distrito: true } }, creadoPor: { select: { nombre: true } } } },
      items: { include: { producto: { select: { nombre: true, emoji: true } } } },
      recepcion: true,
    },
    orderBy: { pedido: { creadoEn: "desc" } },
    take: 300,
  });
  return subs.map((s) => ({ ...s, codigo: codigoPedido(s.pedido.numero), cliente: s.pedido.empresa?.razonSocial ?? `${s.pedido.creadoPor.nombre} (retail)` }));
}

/** Panel del proveedor: ventas del mes, pendientes y liquidación neta por pedido. */
export async function panelProveedor(proveedorId: string) {
  const proveedor = await prisma.proveedor.findUniqueOrThrow({ where: { id: proveedorId } });
  const subs = await subpedidosProveedor(proveedorId);
  const ahora = new Date();
  const inicioMes = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), 1, 5));
  const validos = subs.filter((s) => s.estado !== "RECHAZADO" && s.estado !== "CANCELADO");
  const delMes = validos.filter((s) => s.pedido.creadoEn >= inicioMes);
  const ventasMes = delMes.reduce((t, s) => t + num(s.total), 0);
  const pendientes = validos.filter((s) => s.estado !== "ENTREGADO");
  const liquidaciones = validos.slice(0, 60).map((s) => ({
    id: s.id,
    pedidoId: s.pedidoId,
    codigo: s.codigo,
    cliente: s.cliente,
    fecha: s.pedido.creadoEn,
    estado: s.estado,
    comisionPct: num(s.comision),
    ...liquidacionDetallada(num(s.total), num(s.comision)),
  }));
  const netoMes = delMes.reduce((t, s) => t + liquidacionDetallada(num(s.total), num(s.comision)).neto, 0);
  // Ventas por mes (últimos 6 meses)
  const porMes = new Map<string, number>();
  for (const s of validos) {
    const clave = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" }).format(s.pedido.creadoEn);
    porMes.set(clave, (porMes.get(clave) ?? 0) + num(s.total));
  }
  const meses = [...porMes.entries()].sort().slice(-6).map(([mes, total]) => ({ mes, total: Math.round(total) }));
  return { proveedor, ventasMes, netoMes, pendientes: pendientes.length, entregados: validos.length - pendientes.length, liquidaciones, meses };
}

/** Ofertas del proveedor con su competitividad frente a la mejor oferta del mercado. */
export async function competitividadProveedor(proveedorId: string) {
  const ofertas = await prisma.oferta.findMany({
    where: { proveedorId },
    include: { producto: { include: { categoria: true, ofertas: { where: OFERTA_VISIBLE, include: { proveedor: { select: { razonSocial: true, estado: true } } } } } }, escalas: true },
    orderBy: { producto: { nombre: "asc" } },
  });
  return ofertas.map((o) => {
    const mercado = o.producto.ofertas.map((x) => ({ id: x.id, precio: num(x.precio), stock: x.stock, homologado: true, proveedor: x.proveedor.razonSocial }));
    const mejor = mejorOferta(mercado);
    const precio = num(o.precio);
    const comp = competitividad(precio, mejor?.precio ?? precio);
    return {
      id: o.id,
      productoId: o.productoId,
      producto: o.producto.nombre,
      emoji: o.producto.emoji,
      unidad: o.producto.unidad,
      categoria: o.producto.categoria.nombre,
      precio,
      stock: o.stock,
      pedidoMinimo: o.pedidoMinimo,
      plazoDias: o.plazoDias,
      activa: o.activa,
      escalas: o.escalas.length,
      mejorPrecio: mejor?.precio ?? precio,
      mejorProveedor: mejor?.proveedor ?? "—",
      esMejor: mejor?.id === o.id,
      competidores: mercado.length,
      ...comp,
    };
  });
}
