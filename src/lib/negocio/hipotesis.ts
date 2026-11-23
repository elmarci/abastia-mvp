/**
 * Cálculo de las hipótesis H1–H5 del MVP a partir de datos simples.
 * Las consultas a la base de datos viven en el módulo de administración;
 * aquí solo está la lógica pura, para poder probarla.
 */
import { METAS_HIPOTESIS } from "./constantes";
import { comisionEnRango } from "./proveedor";

export type Semaforo = "VERDE" | "AMBAR" | "ROJO" | "SIN_DATOS";

/**
 * Color del semáforo: verde si cumple la meta, ámbar si llega al 80 % de la
 * meta, rojo en otro caso.
 */
export function semaforo(valor: number | null, meta: number): Semaforo {
  if (valor === null || Number.isNaN(valor)) {
    return "SIN_DATOS";
  }
  if (valor >= meta) {
    return "VERDE";
  }
  if (valor >= meta * 0.8) {
    return "AMBAR";
  }
  return "ROJO";
}

/** H1: ahorro promedio ponderado frente al precio promedio de mercado. */
export function ahorroPromedio(items: readonly { precioUnitario: number; precioPromedio: number; cantidad: number }[]): number | null {
  let pagado = 0;
  let mercado = 0;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    pagado = pagado + item.precioUnitario * item.cantidad;
    mercado = mercado + Math.max(item.precioPromedio, item.precioUnitario) * item.cantidad;
  }
  if (mercado === 0) {
    return null;
  }
  return (mercado - pagado) / mercado;
}

/** H2: fracción de sugerencias compradas sin modificar. */
export function tasaSugerenciasAceptadas(sugerencias: readonly { cantidadSugerida: number; cantidadComprada: number | null }[]): number | null {
  let evaluadas = 0;
  let aceptadas = 0;
  for (let i = 0; i < sugerencias.length; i++) {
    const s = sugerencias[i];
    // Solo cuentan las sugerencias que llegaron a un pedido confirmado
    if (s.cantidadComprada === null) {
      continue;
    }
    evaluadas++;
    if (s.cantidadComprada === s.cantidadSugerida) {
      aceptadas++;
    }
  }
  return evaluadas === 0 ? null : aceptadas / evaluadas;
}

/**
 * H3: fracción de clientes con un segundo pedido dentro de los 30 días
 * posteriores a su primer pedido.
 */
export function tasaRecompra(pedidosPorCliente: ReadonlyMap<string, readonly Date[]>): number | null {
  let clientes = 0;
  let conRecompra = 0;
  const TREINTA_DIAS = 30 * 24 * 60 * 60 * 1000;
  for (const fechas of pedidosPorCliente.values()) {
    if (fechas.length === 0) {
      continue;
    }
    clientes++;
    const ordenadas = [...fechas].sort((a, b) => a.getTime() - b.getTime());
    if (ordenadas.length >= 2 && ordenadas[1].getTime() - ordenadas[0].getTime() <= TREINTA_DIAS) {
      conRecompra++;
    }
  }
  return clientes === 0 ? null : conRecompra / clientes;
}

/** H4: proveedores activos (homologados y con ventas) con comisión entre 5 % y 8 %. */
export function proveedoresActivosEnRango(proveedores: readonly { homologado: boolean; comision: number; pedidos: number }[]): number {
  let total = 0;
  for (let i = 0; i < proveedores.length; i++) {
    const p = proveedores[i];
    if (p.homologado && p.pedidos > 0 && comisionEnRango(p.comision)) {
      total++;
    }
  }
  return total;
}

/**
 * H5: reducción del tiempo para armar un pedido frente a la línea base
 * declarada por el cliente (en minutos).
 */
export function reduccionTiempo(segundosArmado: readonly number[], minutosLineaBase: number): { minutosPromedio: number | null; reduccion: number | null } {
  if (segundosArmado.length === 0 || minutosLineaBase <= 0) {
    return { minutosPromedio: null, reduccion: null };
  }
  let suma = 0;
  for (let i = 0; i < segundosArmado.length; i++) {
    suma = suma + segundosArmado[i];
  }
  const minutosPromedio = suma / segundosArmado.length / 60;
  return { minutosPromedio, reduccion: 1 - minutosPromedio / minutosLineaBase };
}

export { METAS_HIPOTESIS };
