import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Award, Lock } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { BotonAccion } from "@/components/app/boton-accion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fechaHora, soles } from "@/lib/formato";
import { ErrorAcceso, requerirPagina } from "@/lib/sesion";
import { cn } from "@/lib/utils";
import { detalleLicitacion } from "@/modules/licitaciones/consultas";
import { adjudicarLicitacion, cerrarLicitacion } from "@/modules/licitaciones/acciones";
import { ESTADO_LICITACION, ETIQUETAS_CRITERIO } from "@/modules/licitaciones/esquemas";

export const metadata: Metadata = { title: "Licitación" };

export default async function DetalleLicitacion({ params }: { params: Promise<{ id: string }> }) {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const { id } = await params;
  let l: Awaited<ReturnType<typeof detalleLicitacion>>;
  try {
    l = await detalleLicitacion(id, usuario.empresaId!);
  } catch (e) {
    if (e instanceof ErrorAcceso && e.estado === 403) redirect("/comprador/licitaciones?denegado=1");
    notFound();
  }
  return (
    <>
      <Link href="/comprador/licitaciones" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Licitaciones
      </Link>
      <Encabezado
        titulo={`${l.codigo} · ${l.titulo}`}
        descripcion={l.descripcion}
        acciones={
          <div className="flex items-center gap-2">
            <Badge variant={ESTADO_LICITACION[l.estado].variante} data-testid="estado-licitacion">
              {ESTADO_LICITACION[l.estado].texto}
            </Badge>
            {l.contrato && (
              <Link href="/comprador/contratos" className="text-sm font-medium text-primary hover:underline">
                Ver contrato {l.contrato.codigo}
              </Link>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {l.estado === "ABIERTA" ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                  <Lock className="size-6" />
                </span>
                <p className="text-lg font-semibold" data-testid="propuestas-selladas">
                  {l.numeroPropuestas} {l.numeroPropuestas === 1 ? "propuesta sellada" : "propuestas selladas"}
                </p>
                <p className="max-w-md text-sm text-muted-foreground">Nadie puede ver los montos hasta el cierre ({fechaHora(l.fechaCierre)}). Al cerrar, el sistema calcula el puntaje de cada propuesta.</p>
                <BotonAccion accion={cerrarLicitacion.bind(null, l.id)} data-testid="cerrar-licitacion">
                  Cerrar ahora y evaluar
                </BotonAccion>
              </CardContent>
            </Card>
          ) : l.propuestas.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">La licitación quedó desierta: no se recibieron propuestas.</CardContent>
            </Card>
          ) : (
            l.propuestas.map((p, i) => {
              const ganadora = l.adjudicadaAId === p.proveedorId;
              return (
                <Card key={p.id} className={cn(i === 0 && "border-primary/50", ganadora && "ring-2 ring-primary/40")} data-testid="propuesta">
                  <CardHeader className="gap-2 border-b border-border">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-bold", i === 0 ? "bg-primary text-primary-foreground" : "bg-muted")}>{i + 1}</span>
                        <CardTitle>{p.proveedor.razonSocial}</CardTitle>
                        {ganadora && (
                          <Badge variant="exito">
                            <Award className="size-3" /> Adjudicada
                          </Badge>
                        )}
                      </div>
                      <p className="text-2xl font-semibold cifra" data-testid="puntaje">
                        {p.puntaje.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">pts</span>
                      </p>
                    </div>
                    <Progress value={p.puntaje} />
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 gap-3 pt-4 text-sm sm:grid-cols-3">
                    <p>
                      Monto <span className="block font-semibold cifra">{soles(p.montoTotal)}</span>
                    </p>
                    <p>
                      Plazo <span className="block font-semibold">{p.plazoEntregaDias} días</span>
                    </p>
                    <p>
                      Calificación <span className="block font-semibold">{p.calificacion.toFixed(1)} / 5</span>
                    </p>
                    <p className="sm:col-span-3 text-muted-foreground">{p.descripcion}</p>
                    <div className="flex flex-wrap gap-1.5 sm:col-span-3">
                      {p.certificados.map((c) => (
                        <Badge key={c} variant={l.certificadosObligatorios.includes(c) ? "info" : "secondary"}>
                          {c}
                        </Badge>
                      ))}
                    </div>
                    {l.estado === "CERRADA" && (
                      <div className="sm:col-span-3">
                        <BotonAccion accion={adjudicarLicitacion.bind(null, p.id)} irA="/comprador/contratos" variant={i === 0 ? "default" : "outline"} data-testid={i === 0 ? "adjudicar-primera" : undefined}>
                          <Award /> Adjudicar y crear contrato
                        </BotonAccion>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        <Card className="h-fit">
          <CardHeader className="border-b border-border">
            <CardTitle>Bases</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4 text-sm">
            <p>
              <span className="text-muted-foreground">Cierre:</span> {fechaHora(l.fechaCierre)}
            </p>
            <p>
              <span className="text-muted-foreground">Contrato:</span> {l.plazoContratoMeses} meses, entrega {l.frecuencia.toLowerCase()}
            </p>
            <p>
              <span className="text-muted-foreground">Volumen:</span> {l.volumenEstimado}
            </p>
            {l.presupuestoReferencial && (
              <p>
                <span className="text-muted-foreground">Presupuesto:</span> <span className="cifra">{soles(l.presupuestoReferencial)}</span>
              </p>
            )}
            <div>
              <p className="mb-1.5 text-muted-foreground">Certificados obligatorios</p>
              <div className="flex flex-wrap gap-1.5">
                {l.certificadosObligatorios.map((c) => (
                  <Badge key={c} variant="info">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Criterios ponderados</p>
              {l.criterios.map((c) => (
                <div key={c.id} className="flex items-center gap-2">
                  <span className="flex-1">{ETIQUETAS_CRITERIO[c.tipo]}</span>
                  <span className="font-semibold cifra">{c.peso} %</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
