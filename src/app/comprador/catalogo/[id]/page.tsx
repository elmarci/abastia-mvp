import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, PackageCheck, QrCode, Star, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { fechaSolo, porcentaje, soles } from "@/lib/formato";
import { detalleProducto } from "@/modules/catalogo/consultas";
import { AgregarAlPedido } from "@/modules/catalogo/componentes/agregar";

export default async function PaginaProducto({ params }: { params: Promise<{ id: string }> }) {
  await requerirPagina(ROLES_COMPRADOR);
  const { id } = await params;
  const p = await detalleProducto(id);
  if (!p) notFound();

  return (
    <>
      <Link href="/comprador/catalogo" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver al catálogo
      </Link>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-muted text-5xl" aria-hidden>
              {p.emoji}
            </span>
            <div>
              <Badge variant="secondary">{p.categoria}</Badge>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{p.nombre}</h1>
              <p className="mt-1 text-sm text-muted-foreground">Unidad de venta: {p.unidad}</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ofertas de {p.numeroProveedores} proveedores homologados</CardTitle>
              <CardDescription>Ordenadas de menor a mayor precio. Puedes elegir otra oferta por plazo o calificación.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {p.ofertas.map((o) => {
                const esMejor = p.mejor?.id === o.id;
                return (
                  <div key={o.id} className={`rounded-xl border p-4 ${esMejor ? "border-primary/50 bg-secondary/40" : "border-border"}`} data-testid="fila-oferta">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{o.proveedor}</p>
                          {esMejor && (
                            <Badge>
                              <Trophy className="size-3" /> Mejor oferta
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Star className="size-3.5 fill-amber-400 text-amber-400" /> {o.calificacion > 0 ? o.calificacion.toFixed(1) : "Nuevo"}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <PackageCheck className="size-3.5" /> Mínimo {o.pedidoMinimo} · stock {o.stock}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="size-3.5" /> Entrega en {o.plazoDias} {o.plazoDias === 1 ? "día" : "días"}
                          </span>
                        </div>
                        {o.escalas.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {o.escalas.map((e) => (
                              <Badge key={e.cantidadMinima} variant="secondary" className="cifra">
                                {e.cantidadMinima}+ a {soles(e.precio)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-4 md:justify-end">
                        <div className="text-right">
                          <p className="text-lg font-semibold cifra">{soles(o.precio)}</p>
                          {o.precio > p.promedio ? (
                            <p className="text-xs text-muted-foreground cifra">+{porcentaje((o.precio - p.promedio) / p.promedio)} vs. promedio</p>
                          ) : (
                            <p className="text-xs text-amber-700 dark:text-amber-300 cifra">−{porcentaje((p.promedio - o.precio) / p.promedio)} vs. promedio</p>
                          )}
                        </div>
                        <AgregarAlPedido ofertaId={o.id} minimo={o.pedidoMinimo} compacto className="w-48" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen de precios</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mejor oferta</span>
                <span className="font-semibold cifra">{p.mejor ? soles(p.mejor.precio) : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio promedio</span>
                <span className="cifra">{soles(p.promedio)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ahorro frente al promedio</span>
                <Badge variant="ahorro">{porcentaje(p.ahorro)}</Badge>
              </div>
              <p className="pt-2 text-xs text-muted-foreground">Ahorro = (promedio − mejor) ÷ promedio. Solo se consideran proveedores homologados con stock.</p>
            </CardContent>
          </Card>
          {p.lotes.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Trazabilidad</CardTitle>
                <CardDescription>Lotes recientes con certificados.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {p.lotes.map((l) => (
                  <Link key={l.id} href={`/trazabilidad/${l.codigo}`} className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted">
                    <QrCode className="size-5 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{l.codigo}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {l.oferta.proveedor.razonSocial} · vence {fechaSolo(l.fechaVencimiento)}
                      </span>
                    </span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </>
  );
}
