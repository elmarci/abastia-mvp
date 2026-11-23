import "server-only";
import type { PedidoRecurrente } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { hoyEnLima, precioPorVolumen, primeraFechaEntrega, sumarDias } from "@/lib/negocio";
import { promediosPorProducto } from "@/modules/catalogo/consultas";
import { crearPedido } from "@/modules/pedidos/servicio";

export type ItemRecurrente = { ofertaId: string; cantidad: number };
export const DIAS_FRECUENCIA = { SEMANAL: 7, QUINCENAL: 14, MENSUAL: 30 } as const;

/** Lee los ítems guardados como JSON de forma segura. */
export function itemsRecurrente(valor: unknown): ItemRecurrente[] {
  if (!Array.isArray(valor)) return [];
  const items: ItemRecurrente[] = [];
  for (const v of valor) {
    if (v && typeof v === "object" && typeof (v as ItemRecurrente).ofertaId === "string" && Number((v as ItemRecurrente).cantidad) > 0) {
      items.push({ ofertaId: (v as ItemRecurrente).ofertaId, cantidad: Math.floor(Number((v as ItemRecurrente).cantidad)) });
    }
  }
  return items;
}

/**
 * Genera el pedido de un recurrente con los precios vigentes (incluye precio
 * por volumen) y programa la siguiente ejecución.
 */
export async function ejecutarRecurrente(rec: PedidoRecurrente, hoy: string = hoyEnLima()) {
  const items = itemsRecurrente(rec.items);
  const ofertas = await prisma.oferta.findMany({
    where: { id: { in: items.map((i) => i.ofertaId) }, activa: true, proveedor: { estado: "HOMOLOGADO" } },
    include: { escalas: true },
  });
  const promedios = await promediosPorProducto(ofertas.map((o) => o.productoId));
  const lineas = [];
  for (const item of items) {
    const o = ofertas.find((x) => x.id === item.ofertaId);
    if (!o) continue; // la oferta ya no está disponible
    const precio = precioPorVolumen({ precio: num(o.precio), escalas: o.escalas.map((e) => ({ cantidadMinima: e.cantidadMinima, precio: num(e.precio) })) }, item.cantidad).precio;
    lineas.push({ ofertaId: o.id, productoId: o.productoId, proveedorId: o.proveedorId, cantidad: item.cantidad, precioUnitario: precio, precioPromedio: promedios.get(o.productoId) ?? precio });
  }
  // Siguiente fecha: se suma la frecuencia hasta pasar de hoy
  let proxima = rec.proximaEjecucion.toISOString().slice(0, 10);
  while (proxima <= hoy) proxima = sumarDias(proxima, DIAS_FRECUENCIA[rec.frecuencia]);

  const pedido =
    lineas.length === 0
      ? null
      : await crearPedido({
          empresaId: rec.empresaId,
          sedeId: rec.sedeId,
          creadoPorId: rec.creadoPorId,
          canal: "RECURRENTE",
          fechaEntrega: primeraFechaEntrega(hoy),
          metodoPago: "TRANSFERENCIA",
          notas: `Pedido recurrente: ${rec.nombre}`,
          lineas,
        });
  await prisma.pedidoRecurrente.update({ where: { id: rec.id }, data: { proximaEjecucion: new Date(`${proxima}T00:00:00Z`), ultimaEjecucion: new Date() } });
  return pedido;
}

/** Ejecuta los recurrentes activos que vencen hoy o antes (cron diario). */
export async function ejecutarRecurrentesDelDia(hoy: string = hoyEnLima()) {
  const pendientes = await prisma.pedidoRecurrente.findMany({ where: { activo: true, proximaEjecucion: { lte: new Date(`${hoy}T00:00:00Z`) } } });
  let generados = 0;
  for (const r of pendientes) {
    const p = await ejecutarRecurrente(r, hoy);
    if (p) generados++;
  }
  return generados;
}
