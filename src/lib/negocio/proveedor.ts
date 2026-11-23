/**
 * Liquidación del proveedor.
 */
import { COMISION_MAXIMA, COMISION_MINIMA, IGV } from "./constantes";
import { redondear2 } from "./ofertas";

export interface Liquidacion {
  total: number;
  valorVenta: number;
  igv: number;
  comision: number;
  neto: number;
}

/**
 * Neto que recibe el proveedor: neto = (total ÷ 1.18) × (1 − comisión).
 * La comisión se cobra sobre el valor de venta (sin IGV).
 */
export function netoProveedor(total: number, comision: number): number {
  if (total <= 0) {
    return 0;
  }
  if (comision < 0 || comision >= 1) {
    throw new Error("La comisión debe estar entre 0 y 1");
  }
  const valorVenta = total / (1 + IGV);
  return redondear2(valorVenta * (1 - comision));
}

/** Detalle completo de la liquidación de un pedido. */
export function liquidacionDetallada(total: number, comision: number): Liquidacion {
  const valorVenta = redondear2(total / (1 + IGV));
  const igv = redondear2(total - valorVenta);
  const neto = netoProveedor(total, comision);
  const comisionMonto = redondear2(valorVenta - neto);
  return { total: redondear2(total), valorVenta, igv, comision: comisionMonto, neto };
}

/** Indica si una comisión está dentro del rango del modelo (5 % a 8 %). */
export function comisionEnRango(comision: number): boolean {
  return comision >= COMISION_MINIMA - 1e-9 && comision <= COMISION_MAXIMA + 1e-9;
}

/**
 * Competitividad de una oferta frente a la mejor del mercado.
 * Devuelve la diferencia porcentual (0 si es la mejor).
 */
export function competitividad(precioPropio: number, mejorPrecio: number): { competitivo: boolean; porEncima: number } {
  if (mejorPrecio <= 0 || precioPropio <= mejorPrecio) {
    return { competitivo: true, porEncima: 0 };
  }
  const porEncima = (precioPropio - mejorPrecio) / mejorPrecio;
  // Hasta 2 % por encima todavía se considera competitivo
  return { competitivo: porEncima <= 0.02, porEncima };
}
