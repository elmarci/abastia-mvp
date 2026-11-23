import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fecha, fechaSolo } from "@/lib/formato";
import { requerirPagina } from "@/lib/sesion";
import { solicitudesEmpresa } from "@/modules/cotizaciones/consultas";
import { ESTADO_SOLICITUD } from "@/modules/cotizaciones/esquemas";

export const metadata: Metadata = { title: "Cotizaciones" };

export default async function PaginaCotizaciones() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const solicitudes = await solicitudesEmpresa(usuario.empresaId!);
  return (
    <>
      <Encabezado
        titulo="Solicitudes de cotización"
        descripcion="Pide precios a varios proveedores, compáralos en una tabla y convierte la mejor oferta en pedido."
        acciones={
          <Button asChild>
            <Link href="/comprador/cotizaciones/nueva" data-testid="nueva-solicitud">
              <Plus /> Nueva solicitud
            </Link>
          </Button>
        }
      />
      {solicitudes.length === 0 ? (
        <EstadoVacio icono={<ClipboardList className="size-7" />} titulo="Aún no tienes solicitudes" descripcion="Úsalas para compras grandes o productos fuera del catálogo habitual." />
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <Card key={s.id} data-testid="solicitud">
              <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/comprador/cotizaciones/${s.id}`} className="text-lg font-semibold hover:text-primary">
                      {s.codigo} · {s.titulo}
                    </Link>
                    <Badge variant={ESTADO_SOLICITUD[s.estado].variante}>{ESTADO_SOLICITUD[s.estado].texto}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {s.sede.nombre} · para el {fechaSolo(s.fechaRequerida)} · creada {fecha(s.creadoEn)} · {s._count.items} productos
                  </p>
                </div>
                <p className="text-sm">
                  <span className="font-semibold cifra">{s._count.cotizaciones}</span> de {s._count.invitados} proveedores respondieron
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
