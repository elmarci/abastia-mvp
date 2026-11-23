import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requerirPagina } from "@/lib/sesion";
import { detallePedido, type PedidoDetalle } from "@/modules/pedidos/consultas";
import { DetallePedido } from "@/modules/pedidos/componentes/detalle-pedido";
import { FormularioRecepcion } from "@/modules/pedidos/componentes/acciones-pedido";

export default async function DetalleCompra({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina(["CONSUMIDOR"]);
  const { id } = await params;
  let pedido: PedidoDetalle;
  try {
    pedido = await detallePedido(id, usuario);
  } catch {
    notFound();
  }
  return (
    <>
      <Link href="/cuenta" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis compras
      </Link>
      <DetallePedido pedido={pedido} accionSubpedido={(s) => (s.estado === "ENTREGADO" && !s.recepcion ? <FormularioRecepcion subPedidoId={s.id} proveedor={s.proveedor.razonSocial} conTemperatura={false} /> : null)} />
    </>
  );
}
