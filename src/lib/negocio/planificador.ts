/**
 * Planificador de compras con IA: pronóstico de consumo y cantidad sugerida.
 * El modelo base (promedio móvil ponderado) es el predeterminado y coincide
 * exactamente con el informe del proyecto.
 */
import { DIAS_POR_SEMANA, PESOS_PRONOSTICO, STOCK_SEGURIDAD, UMBRAL_STOCK_BAJO } from "./constantes";

export type NivelStock = "SIN_STOCK" | "STOCK_BAJO" | "SUFICIENTE";

export const ETIQUETAS_NIVEL: Record<NivelStock, string> = {
  SIN_STOCK: "Sin stock",
  STOCK_BAJO: "Stock bajo",
  SUFICIENTE: "Suficiente",
};

/**
 * Pronóstico semanal con promedio móvil ponderado.
 * pronostico = Σ historial[i] × PESOS[i] × (personas ÷ personasBase)
 *
 * @param historial consumo de las últimas 4 semanas (de la más antigua a la más reciente).
 *   Si llegan más de 4 semanas, se usan las 4 más recientes.
 * @param personas personas atendidas que se quieren planificar.
 * @param personasBase personas con las que se registró el historial.
 */
export function pronosticoSemanal(historial: readonly number[], personas: number, personasBase: number): number {
  // Sin historial o sin base válida no se puede pronosticar
  if (historial.length === 0 || personasBase <= 0 || personas <= 0) {
    return 0;
  }
  // Tomamos solo las últimas semanas que tengan peso
  const ventana = historial.slice(-PESOS_PRONOSTICO.length);
  // Si hay menos semanas que pesos, usamos los pesos más recientes y los renormalizamos
  const pesos = PESOS_PRONOSTICO.slice(PESOS_PRONOSTICO.length - ventana.length);
  let sumaPesos = 0;
  for (let i = 0; i < pesos.length; i++) {
    sumaPesos = sumaPesos + pesos[i];
  }
  const factorPersonas = personas / personasBase;
  let pronostico = 0;
  // Sumamos cada semana multiplicada por su peso
  for (let i = 0; i < ventana.length; i++) {
    const consumo = Math.max(0, ventana[i]);
    pronostico = pronostico + consumo * (pesos[i] / sumaPesos) * factorPersonas;
  }
  // Redondeamos a 2 decimales para mostrarlo
  return Math.round(pronostico * 100) / 100;
}

/**
 * Cantidad sugerida a comprar.
 * cantidad = máx(0, ⌈pronosticoSemanal × (días ÷ 7) × (1 + STOCK_SEGURIDAD) − stock⌉)
 */
export function cantidadSugerida(pronostico: number, dias: number, stock: number): number {
  // Validamos las entradas: valores negativos o no numéricos no tienen sentido
  if (!Number.isFinite(pronostico) || !Number.isFinite(dias) || !Number.isFinite(stock)) {
    return 0;
  }
  if (pronostico <= 0 || dias <= 0) {
    return 0;
  }
  const stockActual = Math.max(0, stock);
  const necesidad = pronostico * (dias / DIAS_POR_SEMANA) * (1 + STOCK_SEGURIDAD);
  // Restamos lo que ya hay en almacén y redondeamos hacia arriba (con tolerancia a errores de coma flotante)
  const faltante = Math.ceil(Math.round((necesidad - stockActual) * 1e6) / 1e6);
  // Si el stock cubre la necesidad, no se sugiere comprar
  return Math.max(0, faltante);
}

/**
 * Nivel de stock: "Sin stock" si stock = 0; "Stock bajo" si es menor al 30 %
 * del consumo semanal; "Suficiente" en otro caso.
 */
export function nivelStock(stock: number, consumoSemanal: number): NivelStock {
  if (stock <= 0) {
    return "SIN_STOCK";
  }
  if (stock < consumoSemanal * UMBRAL_STOCK_BAJO) {
    return "STOCK_BAJO";
  }
  return "SUFICIENTE";
}

/**
 * Mejora opcional: suavizamiento exponencial doble (Holt) para series con
 * 8 o más semanas. Devuelve el pronóstico de la próxima semana o null si no
 * hay historial suficiente (en ese caso se usa el modelo base).
 */
export function pronosticoHolt(
  historial: readonly number[],
  personas: number,
  personasBase: number,
  alfa = 0.5,
  beta = 0.3,
): number | null {
  if (historial.length < 8 || personasBase <= 0 || personas <= 0) {
    return null;
  }
  let nivel = historial[0];
  let tendencia = historial[1] - historial[0];
  for (let i = 1; i < historial.length; i++) {
    const nivelAnterior = nivel;
    nivel = alfa * historial[i] + (1 - alfa) * (nivel + tendencia);
    tendencia = beta * (nivel - nivelAnterior) + (1 - beta) * tendencia;
  }
  const pronostico = Math.max(0, nivel + tendencia) * (personas / personasBase);
  return Math.round(pronostico * 100) / 100;
}

/** Explicación en lenguaje natural de una sugerencia. */
export function explicarSugerencia(params: {
  producto: string;
  unidad: string;
  sugerida: number;
  pronostico: number;
  personas: number;
  stock: number;
  dias: number;
}): string {
  const { producto, unidad, sugerida, pronostico, personas, stock, dias } = params;
  const consumo = pronostico.toLocaleString("es-PE", { maximumFractionDigits: 1 });
  if (sugerida === 0) {
    return `No necesitas comprar ${producto.toLowerCase()}: tus ${stock} ${unidad} en stock cubren los próximos ${dias} días para ${personas} personas.`;
  }
  return `Sugerimos ${sugerida} ${unidad} porque consumes ~${consumo} por semana para ${personas} personas y tienes ${stock} en stock.`;
}
