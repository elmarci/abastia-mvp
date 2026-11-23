import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";

/** Datos públicos de un lote (sin precios ni datos comerciales). */
export async function lotePublico(codigo: string) {
  const lote = await prisma.lote.findUnique({
    where: { codigo },
    include: {
      certificados: { orderBy: { tipo: "asc" } },
      oferta: { include: { producto: { include: { categoria: true } }, proveedor: { select: { razonSocial: true, ruc: true } } } },
      entregas: { select: { fecha: true, temperatura: true, estado: true }, orderBy: { fecha: "desc" }, take: 10 },
      _count: { select: { itemsPedido: true, entregas: true } },
    },
  });
  if (!lote) return null;
  return { ...lote, entregas: lote.entregas.map((e) => ({ ...e, temperatura: e.temperatura === null ? null : num(e.temperatura) })) };
}

export async function lotesProveedor(proveedorId: string) {
  return prisma.lote.findMany({
    where: { oferta: { proveedorId } },
    include: { certificados: true, oferta: { include: { producto: { select: { nombre: true, emoji: true } } } }, _count: { select: { entregas: true, itemsPedido: true } } },
    orderBy: { creadoEn: "desc" },
  });
}
