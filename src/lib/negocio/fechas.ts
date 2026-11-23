/**
 * Reglas de fechas de entrega (zona horaria America/Lima).
 * Las fechas se manejan como texto "AAAA-MM-DD" para evitar errores de zona horaria.
 */

export const ZONA_HORARIA = "America/Lima";

/** Feriados nacionales del Perú 2026 y 2027 (AAAA-MM-DD). */
export const FERIADOS: readonly string[] = [
  "2026-01-01", "2026-04-02", "2026-04-03", "2026-05-01", "2026-06-07", "2026-06-29",
  "2026-07-23", "2026-07-28", "2026-07-29", "2026-08-06", "2026-08-30", "2026-10-08",
  "2026-11-01", "2026-12-08", "2026-12-09", "2026-12-25",
  "2027-01-01", "2027-03-25", "2027-03-26", "2027-05-01", "2027-06-07", "2027-06-29",
  "2027-07-23", "2027-07-28", "2027-07-29", "2027-08-06", "2027-08-30", "2027-10-08",
  "2027-11-01", "2027-12-08", "2027-12-09", "2027-12-25",
];

/** Fecha de hoy en Lima en formato AAAA-MM-DD. */
export function hoyEnLima(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA }).format(ahora);
}

/** Suma días a una fecha AAAA-MM-DD. */
export function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Día de la semana (0 = domingo) de una fecha AAAA-MM-DD. */
export function diaSemana(fecha: string): number {
  return new Date(`${fecha}T12:00:00Z`).getUTCDay();
}

export function esFeriado(fecha: string): boolean {
  return FERIADOS.includes(fecha);
}

/**
 * Valida una fecha de entrega: mínimo el día siguiente, no domingos ni feriados.
 * Devuelve null si es válida o el mensaje de error.
 */
export function validarFechaEntrega(fecha: string, hoy: string = hoyEnLima()): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(new Date(fecha).getTime())) {
    return "La fecha de entrega no es válida";
  }
  if (fecha <= hoy) {
    return "La entrega debe ser como mínimo el día siguiente";
  }
  if (diaSemana(fecha) === 0) {
    return "No se realizan entregas los domingos";
  }
  if (esFeriado(fecha)) {
    return "No se realizan entregas en feriados";
  }
  return null;
}

/** Primera fecha de entrega válida a partir de mañana. */
export function primeraFechaEntrega(hoy: string = hoyEnLima()): string {
  let fecha = sumarDias(hoy, 1);
  // Avanzamos hasta encontrar un día hábil (máximo 10 intentos)
  for (let i = 0; i < 10; i++) {
    if (validarFechaEntrega(fecha, hoy) === null) {
      return fecha;
    }
    fecha = sumarDias(fecha, 1);
  }
  return fecha;
}

/** Lunes de la semana de una fecha AAAA-MM-DD. */
export function lunesDeSemana(fecha: string): string {
  const dia = diaSemana(fecha);
  const desplazamiento = dia === 0 ? -6 : 1 - dia;
  return sumarDias(fecha, desplazamiento);
}
