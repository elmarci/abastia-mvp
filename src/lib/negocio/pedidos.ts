/**
 * Reglas de estado de los pedidos.
 */
import { ESTADOS_PEDIDO, type EstadoAvance, type EstadoSubPedido } from "./constantes";

export type EstadoPedido = EstadoSubPedido | "PENDIENTE_APROBACION";

/**
 * Estado del pedido del comprador derivado de sus subpedidos:
 * es el estado del subpedido MENOS avanzado. Los subpedidos rechazados o
 * cancelados no cuentan, salvo que todos lo estén.
 */
export function estadoPedidoDerivado(
  estadosSubPedidos: readonly EstadoSubPedido[],
  pendienteAprobacion = false,
): EstadoPedido {
  // Mientras no se apruebe, el pedido no avanza
  if (pendienteAprobacion) {
    return "PENDIENTE_APROBACION";
  }
  if (estadosSubPedidos.length === 0) {
    return "RECIBIDO";
  }
  let indiceMinimo: number = ESTADOS_PEDIDO.length;
  let rechazados = 0;
  let cancelados = 0;
  // Buscamos el subpedido menos avanzado
  for (let i = 0; i < estadosSubPedidos.length; i++) {
    const estado = estadosSubPedidos[i];
    if (estado === "RECHAZADO") {
      rechazados++;
      continue;
    }
    if (estado === "CANCELADO") {
      cancelados++;
      continue;
    }
    const indice = ESTADOS_PEDIDO.indexOf(estado);
    if (indice < indiceMinimo) {
      indiceMinimo = indice;
    }
  }
  // Si todos están fuera del flujo normal, el pedido queda cancelado o rechazado
  if (indiceMinimo === ESTADOS_PEDIDO.length) {
    return rechazados > 0 && cancelados === 0 ? "RECHAZADO" : "CANCELADO";
  }
  return ESTADOS_PEDIDO[indiceMinimo];
}

/** Siguiente estado de avance, o null si ya está entregado o es terminal. */
export function siguienteEstado(estado: EstadoSubPedido): EstadoAvance | null {
  const indice = ESTADOS_PEDIDO.indexOf(estado as EstadoAvance);
  if (indice === -1 || indice === ESTADOS_PEDIDO.length - 1) {
    return null;
  }
  return ESTADOS_PEDIDO[indice + 1];
}

/** Indica si un pedido requiere aprobación según el monto límite de la sede. */
export function requiereAprobacion(total: number, montoLimite: number | null | undefined): boolean {
  if (montoLimite === null || montoLimite === undefined || montoLimite <= 0) {
    return false;
  }
  return total > montoLimite;
}

/** Genera el código visible del pedido: PED-0001. */
export function codigoPedido(numero: number): string {
  return `PED-${String(numero).padStart(4, "0")}`;
}
