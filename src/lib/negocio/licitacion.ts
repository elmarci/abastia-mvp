/**
 * [Alcance ampliado] Evaluación de licitaciones con criterios ponderados.
 */

export type TipoCriterio = "PRECIO" | "CALIDAD" | "PLAZO" | "CALIFICACION";

export interface Criterio {
  tipo: TipoCriterio;
  /** Peso en porcentaje (los pesos suman 100). */
  peso: number;
}

export interface PropuestaEvaluable {
  id: string;
  montoTotal: number;
  plazoEntregaDias: number;
  /** Certificados que presenta el proveedor. */
  certificados: readonly string[];
  /** Calificación promedio del proveedor (1 a 5). */
  calificacion: number;
}

export interface ResultadoPropuesta {
  id: string;
  puntaje: number;
  detalle: Record<TipoCriterio, number>;
  posicion: number;
}

/** Verifica que los pesos sumen 100 %. */
export function pesosValidos(criterios: readonly Criterio[]): boolean {
  let suma = 0;
  for (let i = 0; i < criterios.length; i++) {
    if (criterios[i].peso < 0) return false;
    suma = suma + criterios[i].peso;
  }
  return Math.abs(suma - 100) < 0.001;
}

/**
 * Calcula el puntaje de cada propuesta (0 a 100) y las ordena de mayor a menor.
 * - Precio: el menor monto obtiene el puntaje máximo; los demás en proporción (mín/monto).
 * - Plazo: el menor plazo obtiene el máximo; los demás en proporción.
 * - Calidad: porcentaje de certificados obligatorios presentados.
 * - Calificación: calificación del proveedor sobre 5.
 */
export function puntajeLicitacion(
  propuestas: readonly PropuestaEvaluable[],
  criterios: readonly Criterio[],
  certificadosObligatorios: readonly string[],
): ResultadoPropuesta[] {
  if (propuestas.length === 0) return [];
  if (!pesosValidos(criterios)) {
    throw new Error("Los pesos de los criterios deben sumar 100 %");
  }
  // Buscamos el menor monto y el menor plazo
  let menorMonto = Infinity;
  let menorPlazo = Infinity;
  for (let i = 0; i < propuestas.length; i++) {
    if (propuestas[i].montoTotal > 0 && propuestas[i].montoTotal < menorMonto) menorMonto = propuestas[i].montoTotal;
    if (propuestas[i].plazoEntregaDias > 0 && propuestas[i].plazoEntregaDias < menorPlazo) menorPlazo = propuestas[i].plazoEntregaDias;
  }

  const resultados: ResultadoPropuesta[] = [];
  for (let i = 0; i < propuestas.length; i++) {
    const p = propuestas[i];
    // Puntaje bruto (0 a 1) de cada criterio
    const bruto: Record<TipoCriterio, number> = {
      PRECIO: p.montoTotal > 0 ? menorMonto / p.montoTotal : 0,
      PLAZO: p.plazoEntregaDias > 0 ? menorPlazo / p.plazoEntregaDias : 0,
      CALIDAD: 1,
      CALIFICACION: Math.min(5, Math.max(0, p.calificacion)) / 5,
    };
    if (certificadosObligatorios.length > 0) {
      let cumplidos = 0;
      for (let j = 0; j < certificadosObligatorios.length; j++) {
        if (p.certificados.includes(certificadosObligatorios[j])) cumplidos++;
      }
      bruto.CALIDAD = cumplidos / certificadosObligatorios.length;
    }
    // Aplicamos los pesos
    const detalle: Record<TipoCriterio, number> = { PRECIO: 0, PLAZO: 0, CALIDAD: 0, CALIFICACION: 0 };
    let puntaje = 0;
    for (let k = 0; k < criterios.length; k++) {
      const c = criterios[k];
      const valor = Math.round(bruto[c.tipo] * c.peso * 100) / 100;
      detalle[c.tipo] = valor;
      puntaje = puntaje + valor;
    }
    resultados.push({ id: p.id, puntaje: Math.round(puntaje * 100) / 100, detalle, posicion: 0 });
  }
  // Ordenamos de mayor a menor puntaje y asignamos la posición
  resultados.sort((a, b) => b.puntaje - a.puntaje);
  for (let i = 0; i < resultados.length; i++) {
    resultados[i].posicion = i + 1;
  }
  return resultados;
}

/** Genera las fechas de entrega de un contrato según su frecuencia. */
export function calendarioEntregas(inicio: string, meses: number, frecuencia: "SEMANAL" | "QUINCENAL" | "MENSUAL"): string[] {
  const fechas: string[] = [];
  const paso = frecuencia === "SEMANAL" ? 7 : frecuencia === "QUINCENAL" ? 14 : 30;
  const totalDias = Math.max(1, Math.round(meses * 30));
  const base = new Date(`${inicio}T12:00:00Z`);
  for (let dia = 0; dia < totalDias; dia += paso) {
    const f = new Date(base);
    f.setUTCDate(base.getUTCDate() + dia);
    fechas.push(f.toISOString().slice(0, 10));
  }
  return fechas;
}
