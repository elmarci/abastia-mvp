import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarDays, Download, Factory, MapPin, ShieldAlert, Thermometer, Truck } from "lucide-react";
import { Logo } from "@/components/marca/logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fechaSolo } from "@/lib/formato";
import { hoyEnLima } from "@/lib/negocio";
import { lotePublico } from "@/modules/trazabilidad/consultas";
import { qrDataUrl, urlTrazabilidad } from "@/modules/trazabilidad/qr";

export async function generateMetadata({ params }: { params: Promise<{ lote: string }> }): Promise<Metadata> {
  const { lote } = await params;
  return { title: `Trazabilidad del lote ${decodeURIComponent(lote)}` };
}

/** Página pública del lote: origen, fechas, certificados y QR (auditorías). */
export default async function PaginaTrazabilidad({ params }: { params: Promise<{ lote: string }> }) {
  const { lote } = await params;
  const codigo = decodeURIComponent(lote);
  const l = await lotePublico(codigo);
  if (!l) notFound();
  const url = await urlTrazabilidad(l.codigo);
  const qr = await qrDataUrl(url);
  const hoy = hoyEnLima();
  const vencido = l.fechaVencimiento.toISOString().slice(0, 10) < hoy;
  const p = l.oferta.producto;

  return (
    <div className="min-h-dvh bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <Badge variant="info">Trazabilidad pública</Badge>
        </div>
      </header>
      <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">Lote</p>
            <h1 className="text-3xl font-semibold tracking-tight" data-testid="codigo-lote">
              {l.codigo}
            </h1>
            <p className="text-xl">
              {p.emoji} {p.nombre}
            </p>
            <p className="text-sm text-muted-foreground">{p.categoria.nombre}</p>
            {vencido ? (
              <Badge variant="peligro">
                <ShieldAlert className="size-3" /> Lote vencido
              </Badge>
            ) : (
              <Badge variant="exito">
                <BadgeCheck className="size-3" /> Vigente
              </Badge>
            )}
          </div>
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-background p-4">
            <Image src={qr} alt={`Código QR del lote ${l.codigo}`} width={160} height={160} unoptimized data-testid="qr-lote" />
            <a href={`/trazabilidad/${encodeURIComponent(l.codigo)}/qr`} download className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline" data-testid="descargar-qr">
              <Download className="size-4" /> Descargar QR
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Factory className="size-4" /> Origen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-4 text-sm" data-testid="origen-lote">
              <p className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {l.origen}
              </p>
              {l.descripcionOrigen && <p className="text-muted-foreground">{l.descripcionOrigen}</p>}
              <p>
                <span className="text-muted-foreground">Proveedor:</span> {l.oferta.proveedor.razonSocial} (RUC {l.oferta.proveedor.ruc})
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-4" /> Fechas
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-4 text-sm" data-testid="fechas-lote">
              <p>
                <span className="block text-muted-foreground">Producción</span>
                <span className="font-semibold">{fechaSolo(l.fechaProduccion)}</span>
              </p>
              <p>
                <span className="block text-muted-foreground">Vencimiento</span>
                <span className="font-semibold">{fechaSolo(l.fechaVencimiento)}</span>
              </p>
              <p className="col-span-2 flex items-center gap-1.5 text-muted-foreground">
                <Truck className="size-4" /> Usado en {l._count.itemsPedido} pedidos y {l._count.entregas} entregas de contratos
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <BadgeCheck className="size-4" /> Certificados
            </CardTitle>
          </CardHeader>
          <CardContent className="divide-y divide-border p-0" data-testid="certificados-lote">
            {l.certificados.length === 0 && <p className="p-5 text-sm text-muted-foreground">Sin certificados registrados.</p>}
            {l.certificados.map((c) => {
              const vigente = c.vigencia.toISOString().slice(0, 10) >= hoy;
              return (
                <div key={c.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{c.tipo}</p>
                    <p className="text-sm text-muted-foreground">
                      N.° {c.numero} · {c.emisor}
                    </p>
                  </div>
                  <Badge variant={vigente ? "exito" : "peligro"}>{vigente ? `Vigente hasta ${fechaSolo(c.vigencia)}` : `Venció el ${fechaSolo(c.vigencia)}`}</Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {l.entregas.some((e) => e.temperatura !== null) && (
          <Card>
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2">
                <Thermometer className="size-4" /> Temperatura en entregas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-4">
              {l.entregas
                .filter((e) => e.temperatura !== null)
                .map((e, i) => (
                  <Badge key={i} variant="secondary">
                    {fechaSolo(e.fecha)}: {e.temperatura!.toFixed(1)} °C
                  </Badge>
                ))}
            </CardContent>
          </Card>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Información registrada por el proveedor en AbastIA. Dirección de verificación: <span className="break-all">{url}</span>
        </p>
      </main>
    </div>
  );
}
