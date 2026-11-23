import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { codigoPedido } from "@/lib/negocio";
import { itemsRecurrente } from "@/modules/recurrentes/servicio";

export async function recurrentesEmpresa(empresaId: string) {
  const lista = await prisma.pedidoRecurrente.findMany({ where: { empresaId }, include: { sede: { select: { nombre: true } } }, orderBy: { creadoEn: "asc" } });
  const ids = lista.flatMap((r) => itemsRecurrente(r.items).map((i) => i.ofertaId));
  const ofertas = await prisma.oferta.findMany({ where: { id: { in: ids } }, include: { producto: true, proveedor: { select: { razonSocial: true } } } });
  return lista.map((r) => ({
    id: r.id,
    nombre: r.nombre,
    sede: r.sede.nombre,
    frecuencia: r.frecuencia,
    activo: r.activo,
    proximaEjecucion: r.proximaEjecucion.toISOString().slice(0, 10),
    ultimaEjecucion: r.ultimaEjecucion,
    items: itemsRecurrente(r.items).map((i) => {
      const o = ofertas.find((x) => x.id === i.ofertaId);
      return {
        ...i,
        producto: o ? `${o.producto.emoji} ${o.producto.nombre}` : "Oferta no disponible",
        unidadPlural: o?.producto.unidadPlural ?? "",
        proveedor: o?.proveedor.razonSocial ?? "",
        precio: o ? num(o.precio) : 0,
      };
    }),
  }));
}

export async function pedidosParaRecurrente(empresaId: string) {
  const pedidos = await prisma.pedido.findMany({ where: { empresaId, sedeId: { not: null } }, select: { id: true, numero: true, creadoEn: true, total: true }, orderBy: { creadoEn: "desc" }, take: 15 });
  return pedidos.map((p) => ({ id: p.id, etiqueta: `${codigoPedido(p.numero)} · ${p.creadoEn.toISOString().slice(0, 10)} · S/ ${num(p.total).toFixed(2)}` }));
}

export type RecurrenteVista = Awaited<ReturnType<typeof recurrentesEmpresa>>[number];
