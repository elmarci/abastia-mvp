import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import {
  ahorroPromedio,
  METAS_HIPOTESIS,
  proveedoresActivosEnRango,
  reduccionTiempo,
  semaforo,
  tasaRecompra,
  tasaSugerenciasAceptadas,
} from "@/lib/negocio";

const PEDIDO_VALIDO = { estadoAprobacion: { in: ["NO_REQUIERE" as const, "APROBADO" as const] } };

/** Tablero de validación del MVP: H1–H5 calculadas con datos reales de la base. */
export async function metricasMVP() {
  const [items, sugerencias, pedidos, proveedores, leads, empresas, empresasConPedidos] = await Promise.all([
    prisma.itemPedido.findMany({
      where: { subPedido: { estado: { notIn: ["RECHAZADO", "CANCELADO"] }, pedido: { ...PEDIDO_VALIDO, canal: { not: "RETAIL" } } } },
      select: { precioUnitario: true, precioPromedio: true, cantidad: true },
    }),
    prisma.sugerenciaIA.findMany({ select: { cantidadSugerida: true, cantidadComprada: true } }),
    prisma.pedido.findMany({ where: PEDIDO_VALIDO, select: { empresaId: true, creadoPorId: true, creadoEn: true, segundosArmado: true, canal: true, empresa: { select: { minutosCompraBase: true } } } }),
    prisma.proveedor.findMany({ select: { estado: true, comision: true, _count: { select: { subPedidos: true } } } }),
    prisma.lead.count(),
    prisma.empresa.count(),
    prisma.pedido.groupBy({ by: ["empresaId"], where: { ...PEDIDO_VALIDO, empresaId: { not: null } }, _count: true }),
  ]);

  // H1: ahorro promedio frente al precio promedio de mercado
  const h1 = ahorroPromedio(items.map((i) => ({ precioUnitario: num(i.precioUnitario), precioPromedio: num(i.precioPromedio), cantidad: i.cantidad })));
  // H2: sugerencias compradas sin modificar
  const h2 = tasaSugerenciasAceptadas(sugerencias);
  // H3: clientes con segundo pedido en 30 días
  const porCliente = new Map<string, Date[]>();
  for (const p of pedidos) {
    const clave = p.empresaId ?? `consumidor:${p.creadoPorId}`;
    const lista = porCliente.get(clave) ?? [];
    lista.push(p.creadoEn);
    porCliente.set(clave, lista);
  }
  const h3 = tasaRecompra(porCliente);
  // H4: proveedores activos con comisión en rango
  const h4 = proveedoresActivosEnRango(proveedores.map((p) => ({ homologado: p.estado === "HOMOLOGADO", comision: num(p.comision), pedidos: p._count.subPedidos })));
  // H5: tiempo medio de armado frente a la línea base declarada (promedio ponderado por cliente)
  const conTiempo = pedidos.filter((p) => p.segundosArmado && p.empresa);
  const lineaBase = conTiempo.length ? conTiempo.reduce((s, p) => s + (p.empresa?.minutosCompraBase ?? 0), 0) / conTiempo.length : 0;
  const h5 = reduccionTiempo(conTiempo.map((p) => p.segundosArmado!), lineaBase);

  const hipotesis = [
    { id: "H1", titulo: "Los compradores ahorran", metrica: "Ahorro promedio frente al precio de mercado", valor: h1, meta: METAS_HIPOTESIS.H1, formato: "porcentaje" as const, detalle: `${items.length} líneas de pedido` },
    { id: "H2", titulo: "Aceptan las cantidades de la IA", metrica: "Sugerencias compradas sin modificar", valor: h2, meta: METAS_HIPOTESIS.H2, formato: "porcentaje" as const, detalle: `${sugerencias.filter((s) => s.cantidadComprada !== null).length} sugerencias evaluadas` },
    { id: "H3", titulo: "Repiten la compra", metrica: "Clientes con 2.º pedido en 30 días", valor: h3, meta: METAS_HIPOTESIS.H3, formato: "porcentaje" as const, detalle: `${porCliente.size} clientes con pedidos` },
    { id: "H4", titulo: "Los proveedores aceptan la comisión", metrica: "Proveedores activos con comisión 5–8 %", valor: h4, meta: METAS_HIPOTESIS.H4, formato: "numero" as const, detalle: `${proveedores.filter((p) => p.estado === "HOMOLOGADO").length} homologados` },
    {
      id: "H5",
      titulo: "Compran en menos tiempo",
      metrica: "Reducción del tiempo para armar un pedido",
      valor: h5.reduccion,
      meta: METAS_HIPOTESIS.H5,
      formato: "porcentaje" as const,
      detalle: h5.minutosPromedio !== null ? `${h5.minutosPromedio.toFixed(1)} min promedio vs. ${Math.round(lineaBase)} min de línea base` : "Sin datos",
    },
  ].map((h) => ({ ...h, semaforo: semaforo(h.valor, h.meta) }));

  const embudo = [
    { etapa: "Leads del piloto", valor: leads },
    { etapa: "Empresas registradas", valor: empresas },
    { etapa: "Con primer pedido", valor: empresasConPedidos.filter((e) => e._count >= 1).length },
    { etapa: "Con segundo pedido", valor: empresasConPedidos.filter((e) => e._count >= 2).length },
  ];
  return { hipotesis, embudo };
}

export async function listarProveedores() {
  return prisma.proveedor.findMany({
    orderBy: [{ estado: "asc" }, { razonSocial: "asc" }],
    include: { _count: { select: { ofertas: true, subPedidos: true } }, usuarios: { select: { email: true }, take: 1 } },
  });
}

export async function listarEmpresas() {
  const empresas = await prisma.empresa.findMany({
    orderBy: { creadoEn: "asc" },
    include: { _count: { select: { sedes: true, usuarios: true } }, pedidos: { where: PEDIDO_VALIDO, select: { total: true, ahorro: true } } },
  });
  return empresas.map((e) => ({
    ...e,
    numeroPedidos: e.pedidos.length,
    gasto: e.pedidos.reduce((s, p) => s + num(p.total), 0),
    ahorro: e.pedidos.reduce((s, p) => s + num(p.ahorro), 0),
  }));
}
