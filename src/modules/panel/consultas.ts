import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { mejorOferta, nivelStock, pronosticoSemanal, UMBRAL_ALERTA_PRECIO, type NivelStock } from "@/lib/negocio";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";

const fmtMes = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima", year: "numeric", month: "2-digit" });
export const claveMes = (d: Date) => fmtMes.format(d);

/** Últimos n meses cerrados antes del mes actual (AAAA-MM), del más antiguo al más reciente. */
export function mesesCerrados(n: number, hoy = new Date()) {
  const [a, m] = claveMes(hoy).split("-").map(Number);
  const meses: string[] = [];
  for (let i = n; i >= 1; i--) {
    const d = new Date(Date.UTC(a, m - 1 - i, 15));
    meses.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return meses;
}

/** Ítems de compra válidos de una empresa (pedidos aprobados y subpedidos no rechazados ni cancelados). */
export async function itemsDeCompra(empresaId: string) {
  return prisma.itemPedido.findMany({
    where: {
      subPedido: {
        estado: { notIn: ["RECHAZADO", "CANCELADO"] },
        pedido: { empresaId, estadoAprobacion: { in: ["NO_REQUIERE", "APROBADO"] } },
      },
    },
    include: {
      producto: { select: { nombre: true, categoria: { select: { nombre: true } } } },
      subPedido: { select: { proveedorId: true, pedido: { select: { id: true, numero: true, creadoEn: true, sede: { select: { nombre: true } } } } } },
    },
  });
}

export async function panelGasto(empresaId: string, sedeId: string | null) {
  const items = await itemsDeCompra(empresaId);
  const mesActual = claveMes(new Date());
  const meses = mesesCerrados(6);

  let gastoMes = 0;
  let ahorroTotal = 0;
  let mercadoTotal = 0;
  const pedidosMes = new Set<string>();
  const proveedoresMes = new Set<string>();
  const porMes = new Map<string, number>(meses.map((m) => [m, 0]));
  const porCategoria = new Map<string, number>();
  const porSede = new Map<string, number>();
  const seisMeses = new Set(meses);

  for (const it of items) {
    const importe = num(it.precioUnitario) * it.cantidad;
    const mercado = Math.max(num(it.precioPromedio), num(it.precioUnitario)) * it.cantidad;
    const mes = claveMes(it.subPedido.pedido.creadoEn);
    ahorroTotal += mercado - importe;
    mercadoTotal += mercado;
    if (mes === mesActual) {
      gastoMes += importe;
      pedidosMes.add(it.subPedido.pedido.id);
      proveedoresMes.add(it.subPedido.proveedorId);
    }
    if (porMes.has(mes)) porMes.set(mes, (porMes.get(mes) ?? 0) + importe);
    if (seisMeses.has(mes) || mes === mesActual) {
      const cat = it.producto.categoria.nombre;
      porCategoria.set(cat, (porCategoria.get(cat) ?? 0) + importe);
      const sede = it.subPedido.pedido.sede?.nombre ?? "Sin sede";
      porSede.set(sede, (porSede.get(sede) ?? 0) + importe);
    }
  }

  const ordenar = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([etiqueta, valor]) => ({ etiqueta, valor: Math.round(valor) }));

  return {
    gastoMes,
    ahorroTotal,
    porcentajeAhorro: mercadoTotal > 0 ? ahorroTotal / mercadoTotal : 0,
    pedidosMes: pedidosMes.size,
    proveedoresMes: proveedoresMes.size,
    mensual: meses.map((m) => ({ mes: m, valor: Math.round(porMes.get(m) ?? 0) })),
    porCategoria: ordenar(porCategoria),
    porSede: ordenar(porSede),
    alertasStock: sedeId ? await alertasStock(sedeId) : [],
    alertasPrecio: await alertasPrecio(),
  };
}

/** Productos de la sede con stock bajo o sin stock (según el consumo pronosticado). */
export async function alertasStock(sedeId: string) {
  const sede = await prisma.sede.findUnique({ where: { id: sedeId } });
  if (!sede) return [];
  const [consumos, stocks] = await Promise.all([
    prisma.consumoSemanal.findMany({ where: { sedeId }, orderBy: { semana: "asc" }, include: { producto: { select: { nombre: true, emoji: true, unidadPlural: true } } } }),
    prisma.stockSede.findMany({ where: { sedeId } }),
  ]);
  const historial = new Map<string, { nombre: string; emoji: string; unidad: string; serie: number[] }>();
  for (const c of consumos) {
    const h = historial.get(c.productoId) ?? { nombre: c.producto.nombre, emoji: c.producto.emoji, unidad: c.producto.unidadPlural, serie: [] };
    h.serie.push(c.cantidad);
    historial.set(c.productoId, h);
  }
  const alertas: { productoId: string; nombre: string; emoji: string; unidad: string; stock: number; consumoSemanal: number; nivel: NivelStock }[] = [];
  for (const [productoId, h] of historial) {
    const stock = stocks.find((s) => s.productoId === productoId)?.cantidad ?? 0;
    const consumo = pronosticoSemanal(h.serie, sede.personas, sede.personasBase);
    const nivel = nivelStock(stock, consumo);
    if (nivel !== "SUFICIENTE") alertas.push({ productoId, nombre: h.nombre, emoji: h.emoji, unidad: h.unidad, stock, consumoSemanal: consumo, nivel });
  }
  return alertas.sort((a, b) => (a.nivel === b.nivel ? a.nombre.localeCompare(b.nombre) : a.nivel === "SIN_STOCK" ? -1 : 1));
}

/** Productos cuyo mejor precio bajó ≥ 5 % frente a la semana anterior. */
export async function alertasPrecio() {
  const hace7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const hace14 = new Date(Date.now() - 14 * 24 * 3600 * 1000);
  const productos = await prisma.producto.findMany({
    where: { ofertas: { some: OFERTA_VISIBLE } },
    include: {
      ofertas: {
        where: OFERTA_VISIBLE,
        include: { proveedor: { select: { razonSocial: true } }, historial: { where: { fecha: { gte: hace14, lt: hace7 } }, orderBy: { fecha: "desc" }, take: 1 } },
      },
    },
  });
  const alertas: { productoId: string; nombre: string; emoji: string; anterior: number; actual: number; caida: number; proveedor: string }[] = [];
  for (const p of productos) {
    const actual = mejorOferta(p.ofertas.map((o) => ({ id: o.id, precio: num(o.precio), stock: o.stock, homologado: true, proveedor: o.proveedor.razonSocial })));
    const anteriores = p.ofertas.filter((o) => o.historial.length > 0).map((o) => num(o.historial[0].precio));
    if (!actual || anteriores.length === 0) continue;
    const anterior = Math.min(...anteriores);
    const caida = (anterior - actual.precio) / anterior;
    if (caida >= UMBRAL_ALERTA_PRECIO) alertas.push({ productoId: p.id, nombre: p.nombre, emoji: p.emoji, anterior, actual: actual.precio, caida, proveedor: actual.proveedor });
  }
  return alertas.sort((a, b) => b.caida - a.caida);
}
