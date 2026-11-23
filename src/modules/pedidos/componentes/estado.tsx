import { Badge } from "@/components/ui/badge";
import { ETIQUETAS_ESTADO, type EstadoPedido } from "@/lib/negocio";

const VARIANTES: Record<EstadoPedido, "default" | "secondary" | "exito" | "alerta" | "peligro" | "info"> = {
  PENDIENTE_APROBACION: "alerta",
  RECIBIDO: "secondary",
  CONFIRMADO: "info",
  EN_PREPARACION: "info",
  EN_CAMINO: "default",
  ENTREGADO: "exito",
  RECHAZADO: "peligro",
  CANCELADO: "peligro",
};

export function EstadoBadge({ estado }: { estado: EstadoPedido | string }) {
  const e = estado as EstadoPedido;
  return (
    <Badge variant={VARIANTES[e] ?? "secondary"} data-testid="estado-pedido">
      {ETIQUETAS_ESTADO[e] ?? estado}
    </Badge>
  );
}
