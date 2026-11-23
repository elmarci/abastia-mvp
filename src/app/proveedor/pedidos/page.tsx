import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Card, CardContent } from "@/components/ui/card";
import { requerirPagina } from "@/lib/sesion";
import { fecha, fechaSolo, soles } from "@/lib/formato";
import { ETIQUETAS_ESTADO } from "@/lib/negocio";
import { cn } from "@/lib/utils";
import { subpedidosProveedor } from "@/modules/proveedor/consultas";
import { EstadoBadge } from "@/modules/pedidos/componentes/estado";
import { ProgresoEstados } from "@/modules/pedidos/componentes/linea-tiempo";
import { AccionesSubpedido } from "@/modules/proveedor/componentes/acciones-subpedido";

export const metadata: Metadata = { title: "Pedidos recibidos" };
const FILTROS = ["", "RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "EN_CAMINO", "ENTREGADO", "RECHAZADO"] as const;

export default async function PedidosProveedor({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const { estado } = await searchParams;
  const subs = await subpedidosProveedor(usuario.proveedorId!, { estado: FILTROS.includes(estado as never) ? estado : undefined });
  return (
    <>
      <Encabezado titulo="Pedidos recibidos" descripcion="Confirma, prepara y despacha. El comprador ve cada cambio en su línea de tiempo." />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => (
          <Link key={f || "todos"} href={f ? `/proveedor/pedidos?estado=${f}` : "/proveedor/pedidos"} className={cn("shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted", (estado ?? "") === f && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}>
            {f ? ETIQUETAS_ESTADO[f] : "Todos"}
          </Link>
        ))}
      </div>
      {subs.length === 0 ? (
        <EstadoVacio icono={<Inbox className="size-7" />} titulo="Sin pedidos en este estado" />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => (
            <Card key={s.id} data-testid={`subpedido-${s.codigo}`}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/proveedor/pedidos/${s.pedidoId}`} className="text-lg font-semibold hover:text-primary">
                        {s.codigo}
                      </Link>
                      <EstadoBadge estado={s.estado} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {s.cliente} · {s.pedido.sede ? `${s.pedido.sede.nombre}, ${s.pedido.sede.distrito}` : s.pedido.distritoEntrega} · pedido {fecha(s.pedido.creadoEn)} · entrega {fechaSolo(s.pedido.fechaEntrega)}
                    </p>
                    <p className="mt-1 truncate text-sm">{s.items.map((i) => `${i.producto.emoji} ${i.cantidad} ${i.producto.nombre}`).join(" · ")}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold cifra">{soles(s.total)}</p>
                  </div>
                </div>
                <ProgresoEstados estado={s.estado} />
                <AccionesSubpedido id={s.id} estado={s.estado} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
