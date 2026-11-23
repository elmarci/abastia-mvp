/**
 * [Alcance ampliado] Intérprete por reglas del asistente de compras.
 * Entiende pedidos como "20 kg de arroz y 10 bidones para San Isidro el jueves".
 * No confirma nada: solo propone; el usuario debe pulsar "Confirmar".
 */
import { sumarDias, diaSemana } from "./fechas";

export interface ProductoAsistente {
  id: string;
  nombre: string;
  unidad: string;
  unidadPlural: string;
}

export interface SedeAsistente {
  id: string;
  nombre: string;
  distrito: string;
}

export interface ItemInterpretado {
  productoId: string;
  cantidad: number;
  /** Texto original del fragmento, para mostrarlo al usuario. */
  texto: string;
  nota: string | null;
}

export interface Interpretacion {
  items: ItemInterpretado[];
  sedeId: string | null;
  fecha: string | null;
  noEntendidos: string[];
}

const NUMEROS: Record<string, number> = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, doce: 12, docena: 12, quince: 15, veinte: 20, treinta: 30, cincuenta: 50, cien: 100 };
const DIAS = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
const VACIAS = new Set(["de", "del", "la", "el", "los", "las", "para", "por", "con", "que", "quiero", "necesito", "pedir", "comprar", "manda", "mandame", "envia", "favor", "porfa", "mas", "unos", "unas", "sede", "local"]);
const UNIDADES = new Set(["kg", "kilo", "kilos", "g", "gr", "saco", "sacos", "caja", "cajas", "unidad", "unidades", "paquete", "paquetes", "litro", "litros", "l", "bolsa", "bolsas", "galonera", "galoneras", "jaba", "jabas", "docena", "docenas"]);

/** Minúsculas y sin tildes. */
export function normalizar(texto: string): string {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();
}

/** Singular aproximado para comparar palabras ("bidones" → "bidon"). */
function raiz(palabra: string): string {
  if (palabra.length > 4 && palabra.endsWith("es")) return palabra.slice(0, -2);
  if (palabra.length > 3 && palabra.endsWith("s")) return palabra.slice(0, -1);
  return palabra;
}

/** Fecha mencionada: hoy, mañana, pasado mañana, un día de la semana o AAAA-MM-DD. */
export function interpretarFecha(texto: string, hoy: string): string | null {
  const t = normalizar(texto);
  const iso = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso) return iso[1];
  const dm = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  if (dm) {
    const anio = Number(hoy.slice(0, 4));
    const candidata = `${anio}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}`;
    return candidata < hoy ? `${anio + 1}${candidata.slice(4)}` : candidata;
  }
  if (/\bpasado manana\b/.test(t)) return sumarDias(hoy, 2);
  if (/\bmanana\b/.test(t)) return sumarDias(hoy, 1);
  if (/\bhoy\b/.test(t)) return hoy;
  for (let d = 0; d < DIAS.length; d++) {
    if (new RegExp(`\\b${DIAS[d]}\\b`).test(t)) {
      // Siguiente ocurrencia de ese día (nunca hoy mismo)
      let dias = (d - diaSemana(hoy) + 7) % 7;
      if (dias === 0) dias = 7;
      return sumarDias(hoy, dias);
    }
  }
  return null;
}

/** Sede mencionada por su nombre o su distrito. */
export function interpretarSede(texto: string, sedes: readonly SedeAsistente[]): string | null {
  const t = normalizar(texto);
  for (const s of sedes) {
    const nombre = normalizar(s.nombre).replace(/^(sede|local|hub)\s+/, "");
    if (t.includes(nombre) || t.includes(normalizar(s.distrito))) return s.id;
  }
  return null;
}

/** Busca el producto que mejor coincide con las palabras del fragmento. */
export function buscarProducto(descripcion: string, productos: readonly ProductoAsistente[]): ProductoAsistente | null {
  const palabras = normalizar(descripcion)
    .split(/[^a-z0-9ñ]+/)
    .filter((p) => p.length >= 2 && !VACIAS.has(p) && !/^\d+$/.test(p));
  let mejor: ProductoAsistente | null = null;
  let mejorPuntaje = 0;
  for (const p of productos) {
    const tokens = normalizar(`${p.nombre} ${p.unidadPlural}`).split(/[^a-z0-9ñ]+/).map(raiz);
    let puntaje = 0;
    for (const palabra of palabras) {
      const r = raiz(palabra);
      if (tokens.includes(r)) puntaje += UNIDADES.has(palabra) ? 0.3 : 1;
    }
    // En empate gana el nombre más corto (más específico)
    if (puntaje > mejorPuntaje || (puntaje === mejorPuntaje && puntaje > 0 && mejor && p.nombre.length < mejor.nombre.length)) {
      mejor = p;
      mejorPuntaje = puntaje;
    }
  }
  return mejorPuntaje >= 1 ? mejor : null;
}

/**
 * Convierte "20 kg" a la unidad de venta del producto cuando su nombre
 * indica el contenido (p. ej. "saco 50 kg" → 1 saco). Redondea hacia arriba.
 */
export function convertirCantidad(cantidad: number, unidadTexto: string | null, producto: ProductoAsistente): { cantidad: number; nota: string | null } {
  const u = unidadTexto ? normalizar(unidadTexto) : null;
  const esKg = u === "kg" || u === "kilo" || u === "kilos";
  const esLitro = u === "l" || u === "litro" || u === "litros";
  if ((esKg || esLitro) && producto.unidad !== "kg") {
    const contenido = normalizar(producto.nombre).match(esKg ? /(\d+(?:\.\d+)?)\s*kg\b/ : /(\d+(?:\.\d+)?)\s*l\b/);
    if (contenido) {
      const porUnidad = Number(contenido[1]);
      const unidades = Math.max(1, Math.ceil(cantidad / porUnidad));
      return { cantidad: unidades, nota: `${cantidad} ${esKg ? "kg" : "L"} ≈ ${unidades} ${unidades === 1 ? producto.unidad : producto.unidadPlural} de ${porUnidad} ${esKg ? "kg" : "L"}` };
    }
  }
  return { cantidad: Math.max(1, Math.round(cantidad)), nota: null };
}

/** Interpreta un pedido en lenguaje natural con reglas simples. */
export function interpretarPedido(texto: string, productos: readonly ProductoAsistente[], sedes: readonly SedeAsistente[], hoy: string): Interpretacion {
  const resultado: Interpretacion = { items: [], sedeId: interpretarSede(texto, sedes), fecha: interpretarFecha(texto, hoy), noEntendidos: [] };
  // Quitamos lo que viene después de "para"/"el"/"en" (sede y fecha) de cada fragmento
  const fragmentos = normalizar(texto)
    .split(/(?<!\d),|,(?!\d)|;|\n|\s+y\s+|\s+e\s+|\s+mas\s+/)
    .map((f) => f.split(/\s+(?:para|en|el|al)\s+/)[0].trim())
    .filter((f) => f.length > 0);
  for (const f of fragmentos) {
    const m = f.match(/(?:^|\s)(\d+(?:[.,]\d+)?|un|una|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|doce|docena|quince|veinte|treinta|cincuenta|cien)\s+(.*)$/);
    if (!m) {
      // Sin cantidad: si nombra un producto, cuenta como 1
      const p = buscarProducto(f, productos);
      if (p) resultado.items.push({ productoId: p.id, cantidad: 1, texto: f, nota: "Sin cantidad: se asumió 1" });
      else if (/[a-z]{3,}/.test(f) && !interpretarFecha(f, hoy) && !interpretarSede(f, sedes)) resultado.noEntendidos.push(f);
      continue;
    }
    const cantidad = /^\d/.test(m[1]) ? Number(m[1].replace(",", ".")) : NUMEROS[m[1]];
    const resto = m[2];
    const unidad = resto.split(" ")[0];
    const producto = buscarProducto(resto, productos);
    if (!producto || !(cantidad > 0)) {
      resultado.noEntendidos.push(f);
      continue;
    }
    const conv = convertirCantidad(cantidad, UNIDADES.has(unidad) ? unidad : null, producto);
    const existente = resultado.items.find((i) => i.productoId === producto.id);
    if (existente) existente.cantidad += conv.cantidad;
    else resultado.items.push({ productoId: producto.id, cantidad: conv.cantidad, texto: f, nota: conv.nota });
  }
  return resultado;
}
