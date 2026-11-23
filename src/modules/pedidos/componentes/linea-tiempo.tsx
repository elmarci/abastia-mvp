import { CheckCircle2, Circle, CircleX, ClipboardCheck, ShieldCheck, Truck } from "lucide-react";
import { fechaHora } from "@/lib/formato";
import { ESTADOS_PEDIDO, ETIQUETAS_ESTADO, type EstadoSubPedido } from "@/lib/negocio";
import { cn } from "@/lib/utils";

/** Progreso de un subpedido por los 5 estados. */
export function ProgresoEstados({ estado }: { estado: string }) {
  const terminal = estado === "RECHAZADO" || estado === "CANCELADO";
  const indice = ESTADOS_PEDIDO.indexOf(estado as (typeof ESTADOS_PEDIDO)[number]);
  return (
    <ol className="flex items-center gap-1" aria-label={`Estado: ${ETIQUETAS_ESTADO[estado as EstadoSubPedido] ?? estado}`}>
      {ESTADOS_PEDIDO.map((e, i) => (
        <li key={e} className="flex flex-1 flex-col gap-1">
          <span className={cn("h-1.5 rounded-full bg-muted transition-colors duration-300", !terminal && i <= indice && "bg-primary", terminal && "bg-red-500/30")} />
          <span className={cn("hidden text-[10px] text-muted-foreground sm:block", !terminal && i === indice && "font-medium text-foreground")}>{ETIQUETAS_ESTADO[e]}</span>
        </li>
      ))}
    </ol>
  );
}

const ICONOS: Record<string, typeof Circle> = {
  APROBADO: ShieldCheck,
  PENDIENTE_APROBACION: ShieldCheck,
  EN_CAMINO: Truck,
  ENTREGADO: CheckCircle2,
  RECEPCION_CONFORME: ClipboardCheck,
  RECEPCION_OBSERVADA: ClipboardCheck,
  RECHAZADO: CircleX,
  CANCELADO: CircleX,
};

/** Línea de tiempo auditable con fecha y hora de cada cambio. */
export function LineaTiempo({ eventos }: { eventos: { id: string; estado: string; descripcion: string; fecha: Date; usuario: { nombre: string } | null; subPedido: { proveedor: { razonSocial: string } } | null }[] }) {
  return (
    <ol className="relative space-y-4 border-l border-border pl-6" data-testid="linea-tiempo">
      {eventos.map((e) => {
        const Icono = ICONOS[e.estado] ?? Circle;
        const rojo = e.estado === "RECHAZADO" || e.estado === "CANCELADO";
        return (
          <li key={e.id} className="relative">
            <span className={cn("absolute -left-[33px] flex size-5 items-center justify-center rounded-full bg-card ring-4 ring-card", rojo ? "text-red-500" : "text-primary")}>
              <Icono className="size-4" />
            </span>
            <p className="text-sm font-medium">{e.descripcion}</p>
            <p className="text-xs text-muted-foreground">
              {fechaHora(e.fecha)}
              {e.subPedido && ` · ${e.subPedido.proveedor.razonSocial}`}
              {e.usuario && ` · ${e.usuario.nombre}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
