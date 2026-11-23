import { responder } from "@/lib/api";
import { requerirRol } from "@/lib/sesion";
import { listarPedidos } from "@/modules/pedidos/consultas";
import { prisma } from "@/lib/prisma";
import { codigoPedido } from "@/lib/negocio";

/** GET /api/pedidos: pedidos visibles para el usuario autenticado. */
export async function GET() {
  return responder(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "CONSUMIDOR", "PROVEEDOR"]);
    if (usuario.rol === "PROVEEDOR") {
      const subs = await prisma.subPedido.findMany({
        where: { proveedorId: usuario.proveedorId!, pedido: { estadoAprobacion: { in: ["NO_REQUIERE", "APROBADO"] } } },
        include: { pedido: { select: { id: true, numero: true, creadoEn: true } } },
        orderBy: { pedido: { creadoEn: "desc" } },
        take: 200,
      });
      return { subpedidos: subs.map((s) => ({ id: s.id, pedidoId: s.pedido.id, codigo: codigoPedido(s.pedido.numero), estado: s.estado, total: Number(s.total) })) };
    }
    const pedidos = await listarPedidos(usuario);
    return { pedidos: pedidos.map((p) => ({ id: p.id, codigo: p.codigo, estado: p.estado, total: Number(p.total), ahorro: Number(p.ahorro), creadoEn: p.creadoEn })) };
  });
}
