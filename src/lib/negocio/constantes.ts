/**
 * Constantes del negocio de AbastIA.
 * Coinciden exactamente con los valores del informe del proyecto.
 */

/** Impuesto General a las Ventas del Perú (18 %). */
export const IGV = 0.18;

/** Comisión que AbastIA cobra al proveedor por defecto (6 %). */
export const COMISION_POR_DEFECTO = 0.06;

/** Rango permitido de comisión al proveedor (5 % a 8 %). */
export const COMISION_MINIMA = 0.05;
export const COMISION_MAXIMA = 0.08;

/** Stock de seguridad que se suma al pronóstico (10 %). */
export const STOCK_SEGURIDAD = 0.1;

/**
 * Pesos del promedio móvil ponderado del pronóstico.
 * Van de la semana más antigua (0.1) a la más reciente (0.4) y suman 1.
 */
export const PESOS_PRONOSTICO: readonly number[] = [0.1, 0.2, 0.3, 0.4];

/** Si el stock es menor al 30 % del consumo semanal, el stock es bajo. */
export const UMBRAL_STOCK_BAJO = 0.3;

/** Días por semana, usados para convertir el pronóstico semanal a días. */
export const DIAS_POR_SEMANA = 7;

/** Ahorro objetivo frente al precio promedio de mercado (hipótesis H1). */
export const AHORRO_OBJETIVO = 0.08;

/** Caída mínima de precio para disparar una alerta de precio (5 %). */
export const UMBRAL_ALERTA_PRECIO = 0.05;

/** Precio del plan Pro por sede al mes, en soles. */
export const PRECIO_PLAN_PRO = 149;

/**
 * Estados de un subpedido en orden de avance.
 * El índice indica qué tan avanzado está el subpedido.
 */
export const ESTADOS_PEDIDO = [
  "RECIBIDO",
  "CONFIRMADO",
  "EN_PREPARACION",
  "EN_CAMINO",
  "ENTREGADO",
] as const;

/** Estados terminales que no forman parte del avance normal. */
export const ESTADOS_TERMINALES = ["RECHAZADO", "CANCELADO"] as const;

export type EstadoAvance = (typeof ESTADOS_PEDIDO)[number];
export type EstadoTerminal = (typeof ESTADOS_TERMINALES)[number];
export type EstadoSubPedido = EstadoAvance | EstadoTerminal;

/** Etiquetas en español para mostrar cada estado. */
export const ETIQUETAS_ESTADO: Record<EstadoSubPedido | "PENDIENTE_APROBACION", string> = {
  PENDIENTE_APROBACION: "Pendiente de aprobación",
  RECIBIDO: "Recibido",
  CONFIRMADO: "Confirmado por proveedor",
  EN_PREPARACION: "En preparación",
  EN_CAMINO: "En camino",
  ENTREGADO: "Entregado",
  RECHAZADO: "Rechazado",
  CANCELADO: "Cancelado",
};

/** Metas de las hipótesis del MVP. */
export const METAS_HIPOTESIS = {
  H1: 0.08, // ahorro promedio ≥ 8 %
  H2: 0.6, // ≥ 60 % de sugerencias aceptadas sin modificar
  H3: 0.7, // ≥ 70 % de clientes con segundo pedido en 30 días
  H4: 10, // ≥ 10 proveedores activos con comisión 5–8 %
  H5: 0.5, // reducción ≥ 50 % del tiempo de compra
} as const;
