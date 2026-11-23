import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { mejorOferta, porcentajeAhorro, precioPromedio, type OfertaComparable } from "@/lib/negocio";

/** Filtro de ofertas visibles: activas y de proveedores homologados. */
export const OFERTA_VISIBLE = { activa: true, proveedor: { estado: "HOMOLOGADO" as const } };

export interface OfertaCatalogo extends OfertaComparable {
  proveedorId: string;
  proveedor: string;
  calificacion: number;
  pedidoMinimo: number;
  plazoDias: number;
  escalas: { cantidadMinima: number; precio: number }[];
  precioRetail: number | null;
  unidadRetail: string | null;
}

export interface ProductoCatalogo {
  id: string;
  nombre: string;
  slug: string;
  emoji: string;
  unidad: string;
  unidadPlural: string;
  categoria: string;
  categoriaSlug: string;
  ofertas: OfertaCatalogo[];
  numeroProveedores: number;
  mejor: OfertaCatalogo | null;
  promedio: number;
  ahorro: number;
}

const incluirOfertas = {
  categoria: true,
  ofertas: {
    where: OFERTA_VISIBLE,
    include: { proveedor: true, escalas: { orderBy: { cantidadMinima: "asc" as const } } },
  },
} satisfies Prisma.ProductoInclude;

type ProductoConOfertas = Prisma.ProductoGetPayload<{ include: typeof incluirOfertas }>;

/** Convierte un producto de Prisma a la vista del catálogo con mejor oferta, promedio y ahorro. */
export function aVistaCatalogo(p: ProductoConOfertas): ProductoCatalogo {
  const ofertas: OfertaCatalogo[] = p.ofertas.map((o) => ({
    id: o.id,
    precio: num(o.precio),
    stock: o.stock,
    homologado: o.proveedor.estado === "HOMOLOGADO",
    proveedorId: o.proveedorId,
    proveedor: o.proveedor.razonSocial,
    calificacion: num(o.proveedor.calificacion),
    pedidoMinimo: o.pedidoMinimo,
    plazoDias: o.plazoDias,
    escalas: o.escalas.map((e) => ({ cantidadMinima: e.cantidadMinima, precio: num(e.precio) })),
    precioRetail: o.precioRetail ? num(o.precioRetail) : null,
    unidadRetail: o.unidadRetail,
  }));
  ofertas.sort((a, b) => a.precio - b.precio);
  const mejor = mejorOferta(ofertas);
  const promedio = precioPromedio(ofertas);
  return {
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    emoji: p.emoji,
    unidad: p.unidad,
    unidadPlural: p.unidadPlural,
    categoria: p.categoria.nombre,
    categoriaSlug: p.categoria.slug,
    ofertas,
    numeroProveedores: ofertas.length,
    mejor,
    promedio,
    ahorro: mejor ? porcentajeAhorro(promedio, mejor.precio) : 0,
  };
}

export type OrdenCatalogo = "relevancia" | "precio-asc" | "precio-desc" | "ahorro";

export async function listarCatalogo(filtros: { q?: string; categoria?: string; orden?: OrdenCatalogo; limite?: number }) {
  const where: Prisma.ProductoWhereInput = {
    ofertas: { some: OFERTA_VISIBLE },
  };
  if (filtros.q?.trim()) {
    where.nombre = { contains: filtros.q.trim(), mode: "insensitive" };
  }
  if (filtros.categoria) {
    where.categoria = { slug: filtros.categoria };
  }
  const productos = await prisma.producto.findMany({
    where,
    include: incluirOfertas,
    orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }],
    take: filtros.limite,
  });
  const vista = productos.map(aVistaCatalogo);
  switch (filtros.orden) {
    case "precio-asc":
      vista.sort((a, b) => (a.mejor?.precio ?? Infinity) - (b.mejor?.precio ?? Infinity));
      break;
    case "precio-desc":
      vista.sort((a, b) => (b.mejor?.precio ?? 0) - (a.mejor?.precio ?? 0));
      break;
    case "ahorro":
      vista.sort((a, b) => b.ahorro - a.ahorro);
      break;
  }
  return vista;
}

export async function detalleProducto(id: string) {
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: incluirOfertas,
  });
  if (!producto) return null;
  const lotes = await prisma.lote.findMany({
    where: { oferta: { productoId: id } },
    include: { oferta: { include: { proveedor: { select: { razonSocial: true } } } } },
    orderBy: { fechaProduccion: "desc" },
    take: 3,
  });
  return { ...aVistaCatalogo(producto), descripcion: producto.descripcion, lotes };
}

export async function categorias() {
  return prisma.categoria.findMany({ orderBy: { orden: "asc" } });
}

/** Precio promedio de mercado por producto (ofertas de proveedores homologados). */
export async function promediosPorProducto(productoIds: string[]): Promise<Map<string, number>> {
  const ofertas = await prisma.oferta.findMany({
    where: { productoId: { in: productoIds }, ...OFERTA_VISIBLE },
    select: { productoId: true, precio: true },
  });
  const agrupado = new Map<string, OfertaComparable[]>();
  for (const o of ofertas) {
    const lista = agrupado.get(o.productoId) ?? [];
    lista.push({ id: "", precio: num(o.precio), stock: 1, homologado: true });
    agrupado.set(o.productoId, lista);
  }
  const resultado = new Map<string, number>();
  for (const [id, lista] of agrupado) resultado.set(id, precioPromedio(lista));
  return resultado;
}
