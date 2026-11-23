import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fechaSolo, soles } from "@/lib/formato";
import { requerirPagina } from "@/lib/sesion";
import { solicitudesProveedor } from "@/modules/cotizaciones/consultas";
import { ResponderCotizacion } from "@/modules/cotizaciones/componentes/responder-cotizacion";

export const metadata: Metadata = { title: "Solicitudes de cotización" };

export default async function CotizacionesProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const solicitudes = await solicitudesProveedor(usuario.proveedorId!);
  return (
    <>
      <Encabezado titulo="Solicitudes de cotización" descripcion="Empresas que te invitaron a cotizar. Responde con tu mejor precio, plazo y condiciones." />
      {solicitudes.length === 0 ? (
        <EstadoVacio icono={<ClipboardList className="size-7" />} titulo="No tienes solicitudes por ahora" />
      ) : (
        <div className="space-y-3">
          {solicitudes.map((s) => (
            <Card key={s.id} data-testid={`rfq-${s.codigo}`}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold">
                      {s.codigo} · {s.titulo}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {s.empresa.razonSocial} · {s.sede.nombre}, {s.sede.distrito} · para el {fechaSolo(s.fechaRequerida)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.propia ? <Badge variant="exito">Cotizaste {soles(s.propia.total)}</Badge> : <Badge variant="alerta">Sin responder</Badge>}
                    {s.estado === "ABIERTA" ? <ResponderCotizacion solicitudId={s.id} codigo={s.codigo} items={s.items} propia={s.propia} /> : <Badge variant="secondary">{s.estado === "CONVERTIDA" ? "Adjudicada" : "Cerrada"}</Badge>}
                  </div>
                </div>
                <p className="text-sm">{s.items.map((i) => `${i.producto.emoji} ${i.cantidad} ${i.producto.unidadPlural} de ${i.producto.nombre}`).join(" · ")}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
