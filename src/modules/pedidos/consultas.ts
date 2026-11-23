import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ErrorAcceso, type UsuarioSesion } from "@/lib/sesion";
import { codigoPedido, estadoPedidoDerivado, type EstadoPedido, type EstadoSubPedido } from "@/lib/negocio";

/** Estado visible de un pedido (derivado de sus subpedidos y de la aprobación). */
export function estadoDePedido(p: { estadoAprobacion: string; subPedidos: { estado: string }[] }): EstadoPedido {
  if (p.estadoAprobacion === "RECHAZADO") return "RECHAZADO";
  return estadoPedidoDerivado(
    p.subPedidos.map((s) => s.estado as EstadoSubPedido),
    p.estadoAprobacion === "PENDIENTE",
  );
}

/** Filtro de pedidos visibles para un comprador (aislamiento multiempresa). */
export function filtroPedidosComprador(usuario: UsuarioSesion): Prisma.PedidoWhereInput {
  if (usuario.empresaId) return { empresaId: usuario.empresaId };
  return { creadoPorId: usuario.id };
}

export async function listarPedidos(usuario: UsuarioSesion, filtros: { estado?: string; pendientes?: boolean } = {}) {
  const where: Prisma.PedidoWhereInput = { ...filtroPedidosComprador(usuario) };
  if (filtros.pendientes) where.estadoAprobacion = "PENDIENTE";
  const pedidos = await prisma.pedido.findMany({
    where,
    orderBy: { creadoEn: "desc" },
    include: {
      sede: { select: { nombre: true } },
      creadoPor: { select: { nombre: true } },
      subPedidos: { select: { estado: true, proveedor: { select: { razonSocial: true } } } },
    },
    take: 200,
  });
  return pedidos
    .map((p) => ({ ...p, codigo: codigoPedido(p.numero), estado: estadoDePedido(p) }))
    .filter((p) => !filtros.estado || p.estado === filtros.estado);
}

const incluirDetalle = {
  sede: true,
  empresa: { select: { razonSocial: true, ruc: true } },
  creadoPor: { select: { nombre: true, email: true } },
  aprobadoPor: { select: { nombre: true } },
  eventos: { orderBy: { fecha: "asc" as const }, include: { usuario: { select: { nombre: true } }, subPedido: { select: { proveedor: { select: { razonSocial: true } } } } } },
  subPedidos: {
    orderBy: { total: "desc" as const },
    include: {
      proveedor: { select: { id: true, razonSocial: true, ruc: true, calificacion: true } },
      recepcion: true,
      items: { include: { producto: { select: { id: true, nombre: true, emoji: true, unidad: true, unidadPlural: true } }, lote: { select: { codigo: true } } } },
    },
  },
} satisfies Prisma.PedidoInclude;

export type PedidoDetalle = Prisma.PedidoGetPayload<{ include: typeof incluirDetalle }> & { codigo: string; estado: EstadoPedido };

/**
 * Detalle de un pedido verificando en el servidor que el usuario tenga acceso.
 * - Comprador: solo pedidos de su empresa (o propios si es consumidor).
 * - Proveedor: solo si tiene un subpedido aprobado en el pedido (y solo ve el suyo).
 * - Administrador: todos.
 */
export async function detallePedido(id: string, usuario: UsuarioSesion): Promise<PedidoDetalle> {
  const pedido = await prisma.pedido.findUnique({ where: { id }, include: incluirDetalle });
  if (!pedido) throw new ErrorAcceso(404, "Pedido no encontrado");
  const vista = { ...pedido, codigo: codigoPedido(pedido.numero), estado: estadoDePedido(pedido) };
  if (usuario.rol === "ADMIN") return vista;
  if (usuario.rol === "PROVEEDOR") {
    const propios = pedido.subPedidos.filter((s) => s.proveedorId === usuario.proveedorId);
    const aprobado = pedido.estadoAprobacion === "NO_REQUIERE" || pedido.estadoAprobacion === "APROBADO";
    if (propios.length === 0 || !aprobado) throw new ErrorAcceso(403, "No tienes acceso a este pedido");
    return { ...vista, subPedidos: propios, eventos: pedido.eventos.filter((e) => !e.subPedidoId || propios.some((s) => s.id === e.subPedidoId)) };
  }
  const esPropio = usuario.empresaId ? pedido.empresaId === usuario.empresaId : pedido.creadoPorId === usuario.id;
  if (!esPropio) throw new ErrorAcceso(403, "No tienes acceso a este pedido");
  return vista;
}
