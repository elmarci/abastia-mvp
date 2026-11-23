import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, Star, Trophy } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { BotonAccion } from "@/components/app/boton-accion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fechaSolo, soles } from "@/lib/formato";
import { ErrorAcceso, requerirPagina } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { detalleSolicitud } from "@/modules/cotizaciones/consultas";
import { cerrarSolicitud, convertirEnPedido } from "@/modules/cotizaciones/acciones";
import { ESTADO_SOLICITUD } from "@/modules/cotizaciones/esquemas";

export const metadata: Metadata = { title: "Comparar cotizaciones" };

export default async function DetalleSolicitud({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const { id } = await params;
  let s: Awaited<ReturnType<typeof detalleSolicitud>>;
  try {
    s = await detalleSolicitud(id, usuario.empresaId!);
  } catch (e) {
    if (e instanceof ErrorAcceso && e.estado === 403) redirect("/comprador/cotizaciones?denegado=1");
    notFound();
  }
  const abierta = s.estado === "ABIERTA";
  return (
    <>
      <Link href="/comprador/cotizaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Cotizaciones
      </Link>
      <Encabezado
        titulo={`${s.codigo} · ${s.titulo}`}
        descripcion={`${s.sede.nombre} · para el ${fechaSolo(s.fechaRequerida)} · invitados: ${s.invitados.map((i) => i.razonSocial).join(", ")}`}
        acciones={
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_SOLICITUD[s.estado].variante}>{ESTADO_SOLICITUD[s.estado].texto}</Badge>
            {abierta && (
              <BotonAccion variant="ghost" size="sm" accion={cerrarSolicitud.bind(null, s.id)}>
                Cerrar sin comprar
              </BotonAccion>
            )}
            {s.pedidoId && (
              <Link href={`/comprador/pedidos/${s.pedidoId}`} className="text-sm font-medium text-primary hover:underline">
                Ver pedido
              </Link>
            )}
          </div>
        }
      />
      {s.cotizaciones.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">Aún no hay respuestas. Te avisaremos con una notificación.</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Comparación de {s.cotizaciones.length} cotizaciones</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table data-testid="tabla-comparativa">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-48">Producto</TableHead>
                  {s.cotizaciones.map((c) => (
                    <TableHead key={c.id} className={cn("min-w-44 text-right", c.id === s.mejorId && "bg-secondary/50")}>
                      <span className="flex items-center justify-end gap-1">
                        {c.id === s.mejorId && <Trophy className="size-3.5 text-primary" />}
                        {c.proveedor}
                      </span>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {s.items.map((i) => {
                  const precios = s.cotizaciones.map((c) => c.precios[i.id] ?? Infinity);
                  const minimo = Math.min(...precios);
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        {i.producto.emoji} {i.producto.nombre}
                        <span className="block text-xs text-muted-foreground">
                          {i.cantidad} {i.producto.unidadPlural}
                        </span>
                      </TableCell>
                      {s.cotizaciones.map((c) => (
                        <TableCell key={c.id} className={cn("text-right cifra", c.id === s.mejorId && "bg-secondary/30", c.precios[i.id] === minimo && "font-semibold text-primary")}>
                          {soles(c.precios[i.id] ?? 0)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell className="text-muted-foreground">Plazo y condiciones</TableCell>
                  {s.cotizaciones.map((c) => (
                    <TableCell key={c.id} className={cn("text-right text-xs text-muted-foreground", c.id === s.mejorId && "bg-secondary/30")}>
                      <span className="flex items-center justify-end gap-1">
                        <Clock className="size-3" /> {c.plazoDias} {c.plazoDias === 1 ? "día" : "días"} · <Star className="size-3" /> {c.calificacion.toFixed(1)}
                      </span>
                      {c.condiciones}
                    </TableCell>
                  ))}
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">Total</TableCell>
                  {s.cotizaciones.map((c) => (
                    <TableCell key={c.id} className={cn("text-right text-base font-semibold cifra", c.id === s.mejorId && "bg-secondary/30")} data-testid={c.id === s.mejorId ? "total-mejor" : undefined}>
                      {soles(c.total)}
                    </TableCell>
                  ))}
                </TableRow>
                {abierta && (
                  <TableRow>
                    <TableCell />
                    {s.cotizaciones.map((c) => (
                      <TableCell key={c.id} className={cn("text-right", c.id === s.mejorId && "bg-secondary/30")}>
                        <BotonAccion
                          size="sm"
                          variant={c.id === s.mejorId ? "default" : "outline"}
                          accion={convertirEnPedido.bind(null, c.id)}
                          irA="/comprador/pedidos/:id"
                          data-testid={c.id === s.mejorId ? "convertir-mejor" : undefined}
                        >
                          Convertir en pedido
                        </BotonAccion>
                      </TableCell>
                    ))}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
