/**
 * Cálculos del pedido consolidado (carrito multiproveedor).
 * Los precios de catálogo están expresados con IGV incluido (precio de venta
 * al público mayorista). El subtotal es el valor de venta sin IGV.
 */
import { IGV } from "./constantes";
import { redondear2 } from "./ofertas";

export interface LineaCarrito {
  proveedorId: string;
  /** Precio unitario pagado (incluye IGV). */
  precioUnitario: number;
  /** Precio promedio de mercado del producto (incluye IGV). */
  precioPromedio: number;
  cantidad: number;
}

export interface TotalesCarrito {
  /** Valor de venta (sin IGV). */
  subtotal: number;
  igv: number;
  total: number;
  /** Total si se hubiera pagado el precio promedio de mercado. */
  totalMercado: number;
  ahorro: number;
  porcentajeAhorro: number;
  numeroProveedores: number;
  numeroItems: number;
}

/** Valida que una cantidad sea un entero mayor que cero. */
export function cantidadValida(cantidad: number): boolean {
  return Number.isInteger(cantidad) && cantidad > 0;
}

/**
 * Calcula subtotal, IGV 18 %, total, ahorro frente al promedio y número de
 * proveedores. Lanza un error si alguna cantidad no es un entero positivo.
 */
export function totalesCarrito(lineas: readonly LineaCarrito[]): TotalesCarrito {
  let total = 0;
  let totalMercado = 0;
  let numeroItems = 0;
  const proveedores = new Set<string>();

  // Recorremos cada línea del carrito y acumulamos importes
  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    if (!cantidadValida(linea.cantidad)) {
      throw new Error(`Cantidad no válida en la línea ${i + 1}: debe ser un entero mayor que cero`);
    }
    total = total + linea.precioUnitario * linea.cantidad;
    // Si no hay promedio de mercado, se compara contra el mismo precio (ahorro 0)
    const referencia = linea.precioPromedio > 0 ? linea.precioPromedio : linea.precioUnitario;
    totalMercado = totalMercado + referencia * linea.cantidad;
    numeroItems = numeroItems + linea.cantidad;
    proveedores.add(linea.proveedorId);
  }

  // El total incluye IGV: separamos el valor de venta y el impuesto
  const totalRedondeado = redondear2(total);
  const subtotal = redondear2(totalRedondeado / (1 + IGV));
  const igv = redondear2(totalRedondeado - subtotal);
  const ahorro = redondear2(Math.max(0, totalMercado - totalRedondeado));
  const porcentaje = totalMercado > 0 ? ahorro / totalMercado : 0;

  return {
    subtotal,
    igv,
    total: totalRedondeado,
    totalMercado: redondear2(totalMercado),
    ahorro,
    porcentajeAhorro: porcentaje,
    numeroProveedores: proveedores.size,
    numeroItems,
  };
}
