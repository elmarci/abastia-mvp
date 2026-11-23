import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";

export interface ProductoTienda {
  ofertaId: string;
  productoId: string;
  nombre: string;
  emoji: string;
  categoria: string;
  unidad: string;
  precio: number;
  promedio: number;
  proveedor: string;
}

/**
 * Productos con precio retail: para cada uno, la oferta retail más barata
 * y el promedio retail de mercado (para mostrar el ahorro).
 */
export async function productosTienda(): Promise<ProductoTienda[]> {
  const ofertas = await prisma.oferta.findMany({
    where: { ...OFERTA_VISIBLE, precioRetail: { not: null } },
    include: { producto: { include: { categoria: true } }, proveedor: { select: { razonSocial: true } } },
    orderBy: [{ producto: { categoria: { orden: "asc" } } }, { producto: { nombre: "asc" } }],
  });
  const porProducto = new Map<string, typeof ofertas>();
  for (const o of ofertas) {
    const lista = porProducto.get(o.productoId) ?? [];
    lista.push(o);
    porProducto.set(o.productoId, lista);
  }
  const resultado: ProductoTienda[] = [];
  for (const lista of porProducto.values()) {
    let mejor = lista[0];
    let suma = 0;
    for (const o of lista) {
      suma += num(o.precioRetail!);
      if (num(o.precioRetail!) < num(mejor.precioRetail!)) mejor = o;
    }
    resultado.push({
      ofertaId: mejor.id,
      productoId: mejor.productoId,
      nombre: mejor.producto.nombre,
      emoji: mejor.producto.emoji,
      categoria: mejor.producto.categoria.nombre,
      unidad: mejor.unidadRetail ?? mejor.producto.unidad,
      precio: num(mejor.precioRetail!),
      promedio: Math.round((suma / lista.length) * 100) / 100,
      proveedor: mejor.proveedor.razonSocial,
    });
  }
  return resultado;
}
