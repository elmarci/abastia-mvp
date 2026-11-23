import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { mejorOferta } from "@/lib/negocio";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";

export interface FilaPlanificador {
  productoId: string;
  nombre: string;
  slug: string;
  emoji: string;
  unidad: string;
  unidadPlural: string;
  categoria: string;
  /** Historial completo (de la semana más antigua a la más reciente). */
  historial: number[];
  stock: number;
  mejorOferta: { id: string; precio: number; proveedor: string } | null;
}

/** Datos del planificador para una sede: historial de consumo, stock y mejor oferta. */
export async function datosPlanificador(sedeId: string) {
  const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) return null;
  const consumos = await prisma.consumoSemanal.findMany({
    where: { sedeId },
    orderBy: { semana: "asc" },
    include: { producto: { include: { categoria: true, ofertas: { where: OFERTA_VISIBLE, include: { proveedor: true } } } } },
  });
  const stocks = await prisma.stockSede.findMany({ where: { sedeId } });
  const filas = new Map<string, FilaPlanificador>();
  for (const c of consumos) {
    let fila = filas.get(c.productoId);
    if (!fila) {
      const ofertas = c.producto.ofertas.map((o) => ({ id: o.id, precio: num(o.precio), stock: o.stock, homologado: true, proveedor: o.proveedor.razonSocial }));
      const mejor = mejorOferta(ofertas);
      fila = {
        productoId: c.productoId,
        nombre: c.producto.nombre,
        slug: c.producto.slug,
        emoji: c.producto.emoji,
        unidad: c.producto.unidad,
        unidadPlural: c.producto.unidadPlural,
        categoria: c.producto.categoria.nombre,
        historial: [],
        stock: stocks.find((s) => s.productoId === c.productoId)?.cantidad ?? 0,
        mejorOferta: mejor ? { id: mejor.id, precio: mejor.precio, proveedor: mejor.proveedor } : null,
      };
      filas.set(c.productoId, fila);
    }
    fila.historial.push(c.cantidad);
  }
  return {
    sede: { id: sede.id, nombre: sede.nombre, personas: sede.personas, personasBase: sede.personasBase },
    filas: [...filas.values()].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre)),
  };
}
