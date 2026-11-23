import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Download, QrCode } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fechaSolo } from "@/lib/formato";
import { hoyEnLima } from "@/lib/negocio";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { lotesProveedor } from "@/modules/trazabilidad/consultas";
import { qrDataUrl, urlTrazabilidad } from "@/modules/trazabilidad/qr";
import { FormularioLote } from "@/modules/trazabilidad/componentes/formulario-lote";

export const metadata: Metadata = { title: "Lotes y trazabilidad" };

export default async function LotesProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const [lotes, ofertas] = await Promise.all([
    lotesProveedor(usuario.proveedorId!),
    prisma.oferta.findMany({ where: { proveedorId: usuario.proveedorId! }, select: { id: true, producto: { select: { nombre: true, emoji: true } } }, orderBy: { producto: { nombre: "asc" } } }),
  ]);
  const qrs = await Promise.all(lotes.map(async (l) => qrDataUrl(await urlTrazabilidad(l.codigo))));
  const hoy = hoyEnLima();
  return (
    <>
      <Encabezado
        titulo="Lotes y trazabilidad"
        descripcion="Registra lote, fechas, origen y certificados. Cada lote tiene una página pública con QR para auditorías de hospitales y colegios."
        acciones={<FormularioLote ofertas={ofertas.map((o) => ({ id: o.id, producto: `${o.producto.emoji} ${o.producto.nombre}` }))} hoy={hoy} />}
      />
      {lotes.length === 0 ? (
        <EstadoVacio icono={<QrCode className="size-7" />} titulo="Aún no registraste lotes" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {lotes.map((l, i) => {
            const vencido = l.fechaVencimiento.toISOString().slice(0, 10) < hoy;
            return (
              <Card key={l.id} data-testid={`lote-${l.codigo}`}>
                <CardContent className="flex gap-4 p-5">
                  <Image src={qrs[i]} alt={`QR del lote ${l.codigo}`} width={112} height={112} unoptimized className="size-28 shrink-0 rounded-lg border border-border" />
                  <div className="min-w-0 space-y-1.5">
                    <Link href={`/trazabilidad/${l.codigo}`} className="font-semibold hover:text-primary">
                      {l.codigo}
                    </Link>
                    <p className="text-sm">
                      {l.oferta.producto.emoji} {l.oferta.producto.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Producción {fechaSolo(l.fechaProduccion)} · vence {fechaSolo(l.fechaVencimiento)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {vencido && <Badge variant="peligro">Vencido</Badge>}
                      {l.certificados.map((c) => (
                        <Badge key={c.id} variant="info">
                          {c.tipo}
                        </Badge>
                      ))}
                    </div>
                    <a href={`/trazabilidad/${l.codigo}/qr`} download className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <Download className="size-3" /> Descargar QR
                    </a>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
