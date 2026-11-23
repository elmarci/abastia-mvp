import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { precioPorVolumen, totalesCarrito, type LineaCarrito } from "@/lib/negocio";
import { promediosPorProducto } from "@/modules/catalogo/consultas";

export interface ItemCarritoVista {
  id: string;
  ofertaId: string;
  cantidad: number;
  sugerenciaId: string | null;
  cantidadSugerida: number | null;
  producto: { id: string; nombre: string; emoji: string; unidad: string; unidadPlural: string };
  proveedor: { id: string; razonSocial: string; homologado: boolean };
  precioBase: number;
  precioUnitario: number;
  precioPromedio: number;
  pedidoMinimo: number;
  stock: number;
  plazoDias: number;
  siguienteEscala: { cantidadMinima: number; precio: number; faltan: number } | null;
  errores: string[];
}

/** Carrito del usuario con precios vigentes (por volumen), promedio de mercado y validaciones. */
export async function obtenerCarrito(usuarioId: string) {
  const carrito = await prisma.carrito.findUnique({
    where: { usuarioId },
    include: {
      items: {
        orderBy: { id: "asc" },
        include: {
          sugerencia: { select: { cantidadSugerida: true } },
          oferta: { include: { producto: true, proveedor: true, escalas: true } },
        },
      },
    },
  });
  if (!carrito) return { id: null, iniciadoEn: null, sedeId: null, items: [] as ItemCarritoVista[], totales: totalesCarrito([]), valido: false };
  const promedios = await promediosPorProducto(carrito.items.map((i) => i.oferta.productoId));

  const items: ItemCarritoVista[] = carrito.items.map((i) => {
    const o = i.oferta;
    const volumen = precioPorVolumen({ precio: num(o.precio), escalas: o.escalas.map((e) => ({ cantidadMinima: e.cantidadMinima, precio: num(e.precio) })) }, i.cantidad);
    const errores: string[] = [];
    // Validaciones: proveedor homologado, pedido mínimo y stock disponible
    if (o.proveedor.estado !== "HOMOLOGADO" || !o.activa) errores.push("La oferta ya no está disponible");
    if (i.cantidad < o.pedidoMinimo) errores.push(`Pedido mínimo: ${o.pedidoMinimo} ${o.producto.unidadPlural}`);
    if (i.cantidad > o.stock) errores.push(`Stock disponible: ${o.stock} ${o.producto.unidadPlural}`);
    return {
      id: i.id,
      ofertaId: o.id,
      cantidad: i.cantidad,
      sugerenciaId: i.sugerenciaId,
      cantidadSugerida: i.sugerencia?.cantidadSugerida ?? null,
      producto: { id: o.producto.id, nombre: o.producto.nombre, emoji: o.producto.emoji, unidad: o.producto.unidad, unidadPlural: o.producto.unidadPlural },
      proveedor: { id: o.proveedor.id, razonSocial: o.proveedor.razonSocial, homologado: o.proveedor.estado === "HOMOLOGADO" },
      precioBase: num(o.precio),
      precioUnitario: volumen.precio,
      precioPromedio: promedios.get(o.productoId) ?? num(o.precio),
      pedidoMinimo: o.pedidoMinimo,
      stock: o.stock,
      plazoDias: o.plazoDias,
      siguienteEscala: volumen.siguiente ? { ...volumen.siguiente, faltan: volumen.faltan } : null,
      errores,
    };
  });
  const lineas: LineaCarrito[] = items.map((i) => ({ proveedorId: i.proveedor.id, precioUnitario: i.precioUnitario, precioPromedio: i.precioPromedio, cantidad: i.cantidad }));
  return {
    id: carrito.id,
    iniciadoEn: carrito.iniciadoEn,
    sedeId: carrito.sedeId,
    items,
    totales: totalesCarrito(lineas),
    valido: items.length > 0 && items.every((i) => i.errores.length === 0),
  };
}

export type CarritoVista = Awaited<ReturnType<typeof obtenerCarrito>>;
