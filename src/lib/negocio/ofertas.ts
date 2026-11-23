/**
 * Funciones de comparación de ofertas del catálogo multiproveedor.
 */

/** Datos mínimos de una oferta para comparar precios. */
export interface OfertaComparable {
  id: string;
  precio: number;
  stock: number;
  /** Solo los proveedores homologados pueden ser la mejor oferta. */
  homologado: boolean;
}

/** Escala de precio por volumen (venta por mayor). */
export interface EscalaPrecio {
  cantidadMinima: number;
  precio: number;
}

/** Redondea a 2 decimales (céntimos de sol). */
export function redondear2(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Devuelve la mejor oferta: la de menor precio entre los proveedores
 * homologados que tienen stock disponible. Si no hay ninguna, devuelve null.
 */
export function mejorOferta<T extends OfertaComparable>(ofertas: readonly T[]): T | null {
  let mejor: T | null = null;
  // Recorremos todas las ofertas una por una
  for (let i = 0; i < ofertas.length; i++) {
    const oferta = ofertas[i];
    // Descartamos proveedores no homologados o sin stock
    if (!oferta.homologado || oferta.stock <= 0) {
      continue;
    }
    // Nos quedamos con la de menor precio
    if (mejor === null || oferta.precio < mejor.precio) {
      mejor = oferta;
    }
  }
  return mejor;
}

/**
 * Precio promedio de mercado: media aritmética de los precios de las ofertas
 * de proveedores homologados. Devuelve 0 si no hay ofertas.
 */
export function precioPromedio(ofertas: readonly OfertaComparable[]): number {
  let suma = 0;
  let cantidad = 0;
  for (let i = 0; i < ofertas.length; i++) {
    // Solo cuentan las ofertas de proveedores homologados
    if (ofertas[i].homologado) {
      suma = suma + ofertas[i].precio;
      cantidad = cantidad + 1;
    }
  }
  if (cantidad === 0) {
    return 0;
  }
  return redondear2(suma / cantidad);
}

/**
 * Porcentaje de ahorro = (promedio − mejor) / promedio.
 * Se devuelve como fracción (0.033 = 3.3 %). Si el promedio es 0 o el mejor
 * precio es mayor que el promedio, el ahorro es 0.
 */
export function porcentajeAhorro(promedio: number, mejor: number): number {
  if (promedio <= 0 || mejor <= 0 || mejor >= promedio) {
    return 0;
  }
  return (promedio - mejor) / promedio;
}

/**
 * Precio unitario según el volumen comprado (venta por mayor).
 * Recorre las escalas y aplica la de mayor cantidad mínima alcanzada.
 * Si no hay escalas o no se alcanza ninguna, aplica el precio base.
 */
export function precioPorVolumen(
  oferta: { precio: number; escalas?: readonly EscalaPrecio[] },
  cantidad: number,
): { precio: number; escalaActual: EscalaPrecio | null; siguiente: EscalaPrecio | null; faltan: number } {
  const escalas = [...(oferta.escalas ?? [])].sort((a, b) => a.cantidadMinima - b.cantidadMinima);
  let precio = oferta.precio;
  let escalaActual: EscalaPrecio | null = null;
  let siguiente: EscalaPrecio | null = null;
  // Recorremos las escalas de menor a mayor cantidad mínima
  for (let i = 0; i < escalas.length; i++) {
    const escala = escalas[i];
    if (cantidad >= escala.cantidadMinima) {
      // Alcanzó esta escala: su precio reemplaza al anterior
      precio = escala.precio;
      escalaActual = escala;
    } else {
      // La primera escala que no alcanza es la siguiente meta
      siguiente = escala;
      break;
    }
  }
  const faltan = siguiente ? siguiente.cantidadMinima - cantidad : 0;
  return { precio, escalaActual, siguiente, faltan };
}
