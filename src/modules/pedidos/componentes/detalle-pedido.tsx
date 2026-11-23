import { FileDown, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fecha, fechaSolo, num, soles } from "@/lib/formato";
import { ETIQUETAS_ESTADO, type EstadoSubPedido } from "@/lib/negocio";
import type { PedidoDetalle } from "@/modules/pedidos/consultas";
import { EstadoBadge } from "@/modules/pedidos/componentes/estado";
import { LineaTiempo, ProgresoEstados } from "@/modules/pedidos/componentes/linea-tiempo";

const METODO: Record<string, string> = { TRANSFERENCIA: "Transferencia (simulada)", TARJETA: "Tarjeta (simulada)", CREDITO_30: "Crédito 30 días" };

/** Detalle de un pedido para el comprador (y reutilizable por el consumidor). */
export function DetallePedido({
  pedido,
  accionesSuperiores,
  accionSubpedido,
  vistaProveedor = false,
}: {
  vistaProveedor?: boolean;
  pedido: PedidoDetalle;
  accionesSuperiores?: React.ReactNode;
  accionSubpedido?: (s: PedidoDetalle["subPedidos"][number]) => React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" data-testid="codigo-pedido">
              {pedido.codigo}
            </h1>
            <EstadoBadge estado={pedido.estado} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>Creado el {fecha(pedido.creadoEn)} por {pedido.creadoPor.nombre}</span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {pedido.sede?.nombre ?? pedido.direccionEntrega} · entrega {fechaSolo(pedido.fechaEntrega)}
            </span>
          </p>
          {pedido.motivoRechazo && <p className="mt-2 text-sm text-destructive">Motivo: {pedido.motivoRechazo}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {accionesSuperiores}
          {!vistaProveedor && (
            <Button variant="outline" asChild>
              <a href={`/api/pedidos/${pedido.id}/comprobante`} target="_blank" rel="noopener">
                <FileDown /> Comprobante PDF
              </a>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {pedido.subPedidos.map((s) => (
            <Card key={s.id} data-testid="subpedido">
              <CardHeader className="gap-3 border-b border-border">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>{s.proveedor.razonSocial}</CardTitle>
                    <p className="text-xs text-muted-foreground">RUC {s.proveedor.ruc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <EstadoBadge estado={s.estado} />
                    {accionSubpedido?.(s)}
                  </div>
                </div>
                <ProgresoEstados estado={s.estado} />
                {s.motivoRechazo && <p className="text-sm text-destructive">Motivo: {s.motivoRechazo}</p>}
                {s.recepcion && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="recepcion-registrada">
                    {s.recepcion.conforme ? "Recepción conforme" : `Observación: ${s.recepcion.tipoObservacion}`} ·
                    <span className="inline-flex items-center gap-0.5 text-amber-600">
                      {Array.from({ length: s.recepcion.calificacion }).map((_, i) => (
                        <Star key={i} className="size-3.5 fill-current" />
                      ))}
                    </span>
                  </p>
                )}
              </CardHeader>
              <CardContent className="divide-y divide-border p-0">
                {s.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-5 py-3 text-sm">
                    <span className="text-xl" aria-hidden>
                      {it.producto.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.producto.nombre}</p>
                      <p className="text-xs text-muted-foreground cifra">
                        {it.cantidad} × {soles(it.precioUnitario)} · promedio {soles(it.precioPromedio)}
                        {it.lote && (
                          <>
                            {" "}· lote{" "}
                            <a className="text-primary hover:underline" href={`/trazabilidad/${it.lote.codigo}`}>
                              {it.lote.codigo}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    <p className="font-medium cifra">{soles(num(it.precioUnitario) * it.cantidad)}</p>
                  </div>
                ))}
                <div className="flex justify-between bg-muted/40 px-5 py-3 text-sm">
                  <span className="text-muted-foreground">Subtotal {soles(s.subtotal)} + IGV {soles(s.igv)}</span>
                  <span className="font-semibold cifra">{soles(s.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <aside className="space-y-4">
          {!vistaProveedor && (
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="cifra">{soles(pedido.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">IGV 18 %</span>
                <span className="cifra">{soles(pedido.igv)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="cifra" data-testid="total-pedido">{soles(pedido.total)}</span>
              </div>
              <div className="flex justify-between rounded-xl bg-accent/12 px-3 py-2 text-amber-800 dark:text-amber-200">
                <span>Ahorro vs. promedio</span>
                <span className="font-semibold cifra">{soles(pedido.ahorro)}</span>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">{METODO[pedido.metodoPago]}</Badge>
                <Badge variant="secondary">{pedido.subPedidos.length} proveedores</Badge>
                {pedido.aprobadoPor && <Badge variant="exito">Aprobado por {pedido.aprobadoPor.nombre}</Badge>}
              </div>
              {pedido.notas && <p className="pt-2 text-muted-foreground">Notas: {pedido.notas}</p>}
            </CardContent>
          </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Historial</CardTitle>
            </CardHeader>
            <CardContent>
              <LineaTiempo eventos={pedido.eventos} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

export function etiquetaEstado(e: string) {
  return ETIQUETAS_ESTADO[e as EstadoSubPedido] ?? e;
}
