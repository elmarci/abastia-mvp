import type { Metadata } from "next";
import { CheckCircle2, CircleAlert, CircleDashed, XCircle } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requerirPagina } from "@/lib/sesion";
import { porcentaje } from "@/lib/formato";
import type { Semaforo } from "@/lib/negocio";
import { cn } from "@/lib/utils";
import { metricasMVP } from "@/modules/admin/consultas";

export const metadata: Metadata = { title: "Validación del MVP" };

const ESTILO: Record<Semaforo, { borde: string; texto: string; etiqueta: string; Icono: typeof CheckCircle2 }> = {
  VERDE: { borde: "border-t-emerald-500", texto: "text-emerald-700 dark:text-emerald-300", etiqueta: "Cumple la meta", Icono: CheckCircle2 },
  AMBAR: { borde: "border-t-amber-500", texto: "text-amber-700 dark:text-amber-300", etiqueta: "Cerca de la meta", Icono: CircleAlert },
  ROJO: { borde: "border-t-red-500", texto: "text-red-700 dark:text-red-300", etiqueta: "Lejos de la meta", Icono: XCircle },
  SIN_DATOS: { borde: "border-t-border", texto: "text-muted-foreground", etiqueta: "Sin datos", Icono: CircleDashed },
};

export default async function TableroAdmin() {
  await requerirPagina(["ADMIN"]);
  const { hipotesis, embudo } = await metricasMVP();
  const maximo = Math.max(...embudo.map((e) => e.valor), 1);
  return (
    <>
      <Encabezado titulo="Tablero de validación del MVP" descripcion="Hipótesis H1 a H5 calculadas en vivo con los datos de la base. Verde: cumple; ámbar: al 80 % de la meta; rojo: por debajo." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {hipotesis.map((h) => {
          const e = ESTILO[h.semaforo];
          const valor = h.valor === null ? "—" : h.formato === "porcentaje" ? porcentaje(h.valor) : String(h.valor);
          const meta = h.formato === "porcentaje" ? `≥ ${porcentaje(h.meta, 0)}` : `≥ ${h.meta}`;
          return (
            <Card key={h.id} className={cn("border-t-4", e.borde)} data-testid={`hipotesis-${h.id}`} data-semaforo={h.semaforo}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-semibold">{h.id}</span>
                  <span className={cn("inline-flex items-center gap-1 text-xs font-medium", e.texto)}>
                    <e.Icono className="size-4" /> {e.etiqueta}
                  </span>
                </div>
                <CardTitle className="pt-2">{h.titulo}</CardTitle>
                <CardDescription>{h.metrica}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tracking-tight cifra" data-testid="valor-hipotesis">
                  {valor}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Meta {meta}</p>
                <p className="mt-2 text-xs text-muted-foreground">{h.detalle}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Embudo de clientes</CardTitle>
          <CardDescription>De lead del piloto a cliente recurrente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {embudo.map((e, i) => (
            <div key={e.etapa} className="grid grid-cols-[150px_1fr_64px] items-center gap-3 text-sm sm:grid-cols-[200px_1fr_80px]">
              <span className="text-muted-foreground">{e.etapa}</span>
              <div className="h-7 overflow-hidden rounded-lg bg-muted">
                <div className="h-full rounded-lg bg-primary transition-all duration-500" style={{ width: `${(e.valor / maximo) * 100}%`, opacity: 1 - i * 0.15 }} />
              </div>
              <span className="text-right font-semibold cifra">
                {e.valor}
                {i > 0 && embudo[i - 1].valor > 0 && <span className="ml-1 text-xs font-normal text-muted-foreground">{Math.round((e.valor / embudo[i - 1].valor) * 100)}%</span>}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
