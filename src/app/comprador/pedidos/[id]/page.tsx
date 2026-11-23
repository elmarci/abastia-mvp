import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorAcceso, requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { detallePedido, type PedidoDetalle } from "@/modules/pedidos/consultas";
import { DetallePedido } from "@/modules/pedidos/componentes/detalle-pedido";
import { BotonCancelar, BotonesAprobacion, BotonRepetir, FormularioRecepcion } from "@/modules/pedidos/componentes/acciones-pedido";

export default async function PaginaDetallePedido({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  const { id } = await params;
  let pedido: PedidoDetalle;
  try {
    pedido = await detallePedido(id, usuario);
  } catch (e) {
    if (e instanceof ErrorAcceso && e.estado === 403) redirect("/comprador/pedidos?denegado=1");
    notFound();
  }
  const puedeCancelar = pedido.subPedidos.every((s) => s.estado === "RECIBIDO") && pedido.estadoAprobacion !== "RECHAZADO";

  return (
    <>
      <Link href="/comprador/pedidos" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis pedidos
      </Link>
      <DetallePedido
        pedido={pedido}
        accionesSuperiores={
          <>
            {usuario.rol === "APROBADOR" && pedido.estadoAprobacion === "PENDIENTE" && <BotonesAprobacion pedidoId={pedido.id} />}
            {puedeCancelar && <BotonCancelar pedidoId={pedido.id} />}
            <BotonRepetir pedidoId={pedido.id} />
          </>
        }
        accionSubpedido={(s) =>
          s.estado === "ENTREGADO" && !s.recepcion ? <FormularioRecepcion subPedidoId={s.id} proveedor={s.proveedor.razonSocial} conTemperatura={pedido.empresaId !== null} /> : null
        }
      />
    </>
  );
}
