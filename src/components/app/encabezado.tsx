import { cn } from "@/lib/utils";

/** Encabezado estándar de página. */
export function Encabezado({ titulo, descripcion, acciones, className }: { titulo: string; descripcion?: React.ReactNode; acciones?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{titulo}</h1>
        {descripcion && <p className="mt-1 text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

/** Estado vacío ilustrado. */
export function EstadoVacio({ icono, titulo, descripcion, accion }: { icono: React.ReactNode; titulo: string; descripcion?: string; accion?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-secondary text-3xl text-secondary-foreground">{icono}</div>
      <p className="text-base font-semibold">{titulo}</p>
      {descripcion && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{descripcion}</p>}
      {accion && <div className="mt-5">{accion}</div>}
    </div>
  );
}

/** Tarjeta de indicador (KPI). */
export function Kpi({ titulo, valor, detalle, icono, tono = "default" }: { titulo: string; valor: React.ReactNode; detalle?: React.ReactNode; icono?: React.ReactNode; tono?: "default" | "ahorro" | "alerta" }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        {icono && (
          <span className={cn("flex size-9 items-center justify-center rounded-xl [&_svg]:size-[18px]", tono === "ahorro" ? "bg-accent/15 text-amber-600 dark:text-amber-300" : tono === "alerta" ? "bg-red-500/10 text-red-600" : "bg-secondary text-secondary-foreground")}>
            {icono}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight cifra">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>}
    </div>
  );
}
