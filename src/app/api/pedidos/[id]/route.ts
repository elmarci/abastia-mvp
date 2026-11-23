import { responder } from "@/lib/api";
import { requerirRol } from "@/lib/sesion";
import { detallePedido } from "@/modules/pedidos/consultas";

/** GET /api/pedidos/:id. Devuelve 403 si el pedido es de otra empresa o de otro proveedor. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "CONSUMIDOR", "PROVEEDOR", "ADMIN"]);
    const { id } = await params;
    const p = await detallePedido(id, usuario);
    return {
      id: p.id,
      codigo: p.codigo,
      estado: p.estado,
      estadoAprobacion: p.estadoAprobacion,
      subtotal: Number(p.subtotal),
      igv: Number(p.igv),
      total: Number(p.total),
      subpedidos: p.subPedidos.map((s) => ({
        id: s.id,
        proveedor: s.proveedor.razonSocial,
        estado: s.estado,
        total: Number(s.total),
        items: s.items.map((i) => ({ producto: i.producto.nombre, cantidad: i.cantidad, precioUnitario: Number(i.precioUnitario) })),
      })),
      eventos: p.eventos.map((e) => ({ estado: e.estado, descripcion: e.descripcion, fecha: e.fecha })),
    };
  });
}
