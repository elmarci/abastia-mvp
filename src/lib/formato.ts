/**
 * Formatos para Perú: moneda en soles y fechas en zona America/Lima.
 */
const formatoSoles = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const formatoNumero = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 1 });

type Numerico = number | string | { toString(): string } | null | undefined;

/** Convierte Decimal de Prisma, texto o número a number. */
export function num(valor: Numerico): number {
  if (valor === null || valor === undefined) return 0;
  if (typeof valor === "number") return valor;
  return Number(valor.toString());
}

/** S/ 1,234.50 */
export function soles(valor: Numerico): string {
  // Intl con es-PE produce "S/ 1,234.50"; normalizamos espacios no separables
  return formatoSoles.format(num(valor)).replace(/ /g, " ");
}

export function numero(valor: Numerico): string {
  return formatoNumero.format(num(valor));
}

/** 3.3 % */
export function porcentaje(fraccion: number, decimales = 1): string {
  return `${(fraccion * 100).toFixed(decimales)} %`;
}

const ZONA = "America/Lima";

export function fecha(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, day: "2-digit", month: "short", year: "numeric" }).format(d);
}

/** Para columnas @db.Date (guardadas a medianoche UTC). */
export function fechaSolo(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-PE", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function fechaHora(valor: Date | string): string {
  const d = typeof valor === "string" ? new Date(valor) : valor;
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function mesCorto(valor: Date): string {
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA, month: "short" }).format(valor);
}
