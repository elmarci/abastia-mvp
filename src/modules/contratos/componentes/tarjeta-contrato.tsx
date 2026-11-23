import Link from "next/link";
import { CalendarClock, QrCode, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { fechaSolo, soles } from "@/lib/formato";
import { cn } from "@/lib/utils";
import type { ContratoVista } from "@/modules/contratos/consultas";

const COLOR = { PROGRAMADA: "border-border bg-card", ENTREGADA: "border-primary/40 bg-secondary/60", OBSERVADA: "border-amber-500/40 bg-amber-500/10" } as const;

/** Contrato de abastecimiento programado con su calendario de entregas. */
export function TarjetaContrato({ c, contraparte, accion }: { c: ContratoVista; contraparte: string; accion?: React.ReactNode }) {
  let hechas = 0;
  for (const e of c.entregas) if (e.estado !== "PROGRAMADA") hechas++;
  return (
    <Card data-testid={`contrato-${c.codigo}`}>
      <CardHeader className="gap-2 border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg">
              {c.codigo} · {contraparte}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {c.licitacion ? `Licitación ${c.licitacion.codigo} · ` : ""}
              {fechaSolo(c.inicio)} al {fechaSolo(c.fin)} · entrega {c.frecuencia.toLowerCase()}
              {c.sede ? ` · ${c.sede.nombre}, ${c.sede.distrito}` : ""}
            </p>
          </div>
          <p className="text-xl font-semibold cifra">{soles(c.montoTotal)}</p>
        </div>
        <p className="text-sm">{c.descripcion}</p>
        <div className="flex items-center gap-3">
          <Progress value={(hechas / Math.max(1, c.entregas.length)) * 100} className="flex-1" />
          <span className="text-xs text-muted-foreground cifra" data-testid="avance-entregas">
            {hechas} de {c.entregas.length} entregas
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarClock className="size-4" /> Calendario de entregas
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6" data-testid="calendario-entregas">
          {c.entregas.map((e) => (
            <div key={e.id} className={cn("rounded-xl border p-2 text-xs", COLOR[e.estado])}>
              <p className="font-medium">{fechaSolo(e.fecha)}</p>
              <p className="text-muted-foreground">{e.estado === "PROGRAMADA" ? "Programada" : e.estado === "ENTREGADA" ? "Entregada" : "Observada"}</p>
              {e.lote && (
                <Link href={`/trazabilidad/${e.lote.codigo}`} className="mt-0.5 flex items-center gap-1 text-primary hover:underline">
                  <QrCode className="size-3" /> {e.lote.codigo}
                </Link>
              )}
              {e.temperatura !== null && (
                <p className="flex items-center gap-1 text-muted-foreground">
                  <Thermometer className="size-3" /> {e.temperatura.toFixed(1)} °C
                </p>
              )}
            </div>
          ))}
        </div>
        {accion}
        {c.entregas.some((e) => e.observacion) && (
          <div className="space-y-1">
            {c.entregas
              .filter((e) => e.observacion)
              .map((e) => (
                <Badge key={e.id} variant="alerta">
                  {fechaSolo(e.fecha)}: {e.observacion}
                </Badge>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
