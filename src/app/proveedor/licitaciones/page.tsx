import type { Metadata } from "next";
import { Award, Gavel, Lock } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fechaHora, soles } from "@/lib/formato";
import { requerirPagina } from "@/lib/sesion";
import { licitacionesProveedor } from "@/modules/licitaciones/consultas";
import { ESTADO_LICITACION, ETIQUETAS_CRITERIO } from "@/modules/licitaciones/esquemas";
import { FormularioPropuesta } from "@/modules/licitaciones/componentes/formulario-propuesta";

export const metadata: Metadata = { title: "Licitaciones" };

export default async function LicitacionesProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const lista = await licitacionesProveedor(usuario.proveedorId!);
  return (
    <>
      <Encabezado titulo="Licitaciones" descripcion="Contratos de abastecimiento de instituciones. Tu propuesta queda sellada hasta el cierre." />
      {lista.length === 0 ? (
        <EstadoVacio icono={<Gavel className="size-7" />} titulo="No hay licitaciones abiertas" />
      ) : (
        <div className="space-y-3">
          {lista.map((l) => (
            <Card key={l.id} data-testid={`licitacion-${l.codigo}`}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold">
                        {l.codigo} · {l.titulo}
                      </p>
                      <Badge variant={ESTADO_LICITACION[l.estado].variante}>{ESTADO_LICITACION[l.estado].texto}</Badge>
                      {l.gane && (
                        <Badge variant="exito">
                          <Award className="size-3" /> Ganaste
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {l.empresa.razonSocial} · cierre {fechaHora(l.fechaCierre)} · {l.plazoContratoMeses} meses · entrega {l.frecuencia.toLowerCase()}
                      {l.presupuestoReferencial ? ` · referencial ${soles(l.presupuestoReferencial)}` : ""}
                    </p>
                  </div>
                  {l.estado === "ABIERTA" && <FormularioPropuesta licitacionId={l.id} codigo={l.codigo} propia={l.propia} />}
                </div>
                <p className="text-sm">{l.descripcion}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {l.certificadosObligatorios.map((c) => (
                    <Badge key={c} variant="info">
                      {c}
                    </Badge>
                  ))}
                  {l.criterios.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {ETIQUETAS_CRITERIO[c.tipo]} {c.peso} %
                    </Badge>
                  ))}
                </div>
                {l.propia && (
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="mi-propuesta">
                    <Lock className="size-3.5" /> Tu propuesta: {soles(l.propia.montoTotal)} · {l.propia.plazoEntregaDias} días
                    {l.propia.puntaje !== null && ` · puntaje ${l.propia.puntaje.toFixed(2)}`}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
