import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorAcceso, requerirPagina } from "@/lib/sesion";
import { detallePedido, type PedidoDetalle } from "@/modules/pedidos/consultas";
import { DetallePedido } from "@/modules/pedidos/componentes/detalle-pedido";
import { AccionesSubpedido } from "@/modules/proveedor/componentes/acciones-subpedido";

export default async function DetallePedidoProveedor({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const { id } = await params;
  let pedido: PedidoDetalle;
  try {
    pedido = await detallePedido(id, usuario);
  } catch (e) {
    if (e instanceof ErrorAcceso && e.estado === 403) redirect("/proveedor/pedidos?denegado=1");
    notFound();
  }
  return (
    <>
      <Link href="/proveedor/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Pedidos recibidos
      </Link>
      <DetallePedido pedido={pedido} vistaProveedor accionSubpedido={(s) => <AccionesSubpedido id={s.id} estado={s.estado} compacto />} />
    </>
  );
}
