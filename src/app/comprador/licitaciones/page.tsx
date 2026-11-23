import type { Metadata } from "next";
import Link from "next/link";
import { Gavel, Lock, Plus } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fechaHora } from "@/lib/formato";
import { requerirPagina } from "@/lib/sesion";
import { licitacionesEmpresa } from "@/modules/licitaciones/consultas";
import { ESTADO_LICITACION } from "@/modules/licitaciones/esquemas";

export const metadata: Metadata = { title: "Licitaciones" };

export default async function PaginaLicitaciones() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const lista = await licitacionesEmpresa(usuario.empresaId!);
  return (
    <>
      <Encabezado
        titulo="Licitaciones"
        descripcion="Para hospitales, colegios y proyectos: bases con requisitos, propuestas selladas hasta el cierre y evaluación con criterios ponderados."
        acciones={
          <Button asChild>
            <Link href="/comprador/licitaciones/nueva" data-testid="nueva-licitacion">
              <Plus /> Nueva licitación
            </Link>
          </Button>
        }
      />
      {lista.length === 0 ? (
        <EstadoVacio icono={<Gavel className="size-7" />} titulo="Aún no publicaste licitaciones" descripcion="Úsalas para contratos de abastecimiento de varios meses." />
      ) : (
        <div className="space-y-3">
          {lista.map((l) => (
            <Card key={l.id} data-testid={`licitacion-${l.codigo}`}>
              <CardContent className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/comprador/licitaciones/${l.id}`} className="text-lg font-semibold hover:text-primary">
                      {l.codigo} · {l.titulo}
                    </Link>
                    <Badge variant={ESTADO_LICITACION[l.estado].variante}>{ESTADO_LICITACION[l.estado].texto}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Cierre {fechaHora(l.fechaCierre)} · {l.plazoContratoMeses} meses · entrega {l.frecuencia.toLowerCase()}
                    {l.contrato && ` · contrato ${l.contrato.codigo}`}
                  </p>
                </div>
                <p className="flex items-center gap-1.5 text-sm">
                  {l.estado === "ABIERTA" && <Lock className="size-3.5 text-muted-foreground" />}
                  <span className="font-semibold cifra">{l._count.propuestas}</span> propuestas
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
