/**
 * Datos de referencia para la semilla (empresas ficticias, precios de Lima 2026 en S/).
 */

export const CATEGORIAS = [
  { nombre: "Abarrotes", slug: "abarrotes", icono: "🌾" },
  { nombre: "Bebidas", slug: "bebidas", icono: "💧" },
  { nombre: "Café y oficina", slug: "cafe-oficina", icono: "☕" },
  { nombre: "Limpieza e higiene", slug: "limpieza-higiene", icono: "🧴" },
  { nombre: "Descartables", slug: "descartables", icono: "🥤" },
  { nombre: "Frescos", slug: "frescos", icono: "🥬" },
  { nombre: "Lácteos", slug: "lacteos", icono: "🥛" },
  { nombre: "Carnes", slug: "carnes", icono: "🍗" },
] as const;

export type SlugCategoria = (typeof CATEGORIAS)[number]["slug"];

export interface ProveedorSemilla {
  clave: string;
  razonSocial: string;
  ruc10: string;
  tipo: string;
  categorias: SlugCategoria[];
  zona: string[];
  comision: number;
  email: string;
  contacto: string;
  estado?: "PENDIENTE" | "HOMOLOGADO";
}

export const PROVEEDORES: ProveedorSemilla[] = [
  { clave: "limaNorte", razonSocial: "Distribuidora Lima Norte S.A.C.", ruc10: "2060112345", tipo: "Distribuidor", categorias: ["abarrotes", "bebidas", "cafe-oficina", "limpieza-higiene", "descartables", "lacteos"], zona: ["Lima Moderna", "Lima Norte", "Lima Centro"], comision: 0.06, email: "ventas@limanorte.pe", contacto: "Rosa Quispe" },
  { clave: "molino", razonSocial: "Molino del Valle S.A.", ruc10: "2051123456", tipo: "Productor", categorias: ["abarrotes"], zona: ["Lima Moderna", "Lima Sur"], comision: 0.05, email: "ventas@molinodelvalle.pe", contacto: "Marco Huamán" },
  { clave: "santaAnita", razonSocial: "Mayorista Santa Anita E.I.R.L.", ruc10: "2060234567", tipo: "Mayorista", categorias: ["abarrotes", "bebidas", "frescos", "carnes"], zona: ["Lima Este", "Lima Moderna"], comision: 0.07, email: "ventas@santaanita.pe", contacto: "Julio Cárdenas" },
  { clave: "pacifico", razonSocial: "Alimentos Pacífico S.A.C.", ruc10: "2052234567", tipo: "Fabricante", categorias: ["abarrotes", "cafe-oficina", "frescos", "lacteos"], zona: ["Lima Metropolitana", "Provincias"], comision: 0.06, email: "ventas@alimentospacifico.pe", contacto: "Patricia Rojas" },
  { clave: "cafeSelva", razonSocial: "Cooperativa Café Selva Central Ltda.", ruc10: "2048934567", tipo: "Cooperativa", categorias: ["cafe-oficina"], zona: ["Lima Metropolitana"], comision: 0.05, email: "ventas@cafeselva.pe", contacto: "Elmer Chávez" },
  { clave: "aguasSur", razonSocial: "Aguas del Sur S.A.C.", ruc10: "2060345678", tipo: "Fabricante", categorias: ["bebidas"], zona: ["Lima Moderna", "Lima Sur"], comision: 0.07, email: "ventas@aguasdelsur.pe", contacto: "Sandra Flores" },
  { clave: "higiene", razonSocial: "Higiene Total Perú S.A.C.", ruc10: "2055345678", tipo: "Distribuidor", categorias: ["limpieza-higiene", "descartables"], zona: ["Lima Metropolitana"], comision: 0.06, email: "ventas@higienetotal.pe", contacto: "Karina Vega" },
  { clave: "avicola", razonSocial: "Avícola Los Andes S.A.", ruc10: "2049456789", tipo: "Productor", categorias: ["carnes", "frescos"], zona: ["Lima Metropolitana"], comision: 0.08, email: "ventas@avicolalosandes.pe", contacto: "Raúl Mendoza" },
  { clave: "ecopack", razonSocial: "EcoPack Perú S.A.C.", ruc10: "2060456789", tipo: "Fabricante", categorias: ["descartables", "limpieza-higiene"], zona: ["Lima Metropolitana"], comision: 0.06, email: "ventas@ecopack.pe", contacto: "Diana Torres" },
  { clave: "mantaro", razonSocial: "Lácteos Mantaro S.A.C.", ruc10: "2048567890", tipo: "Productor", categorias: ["lacteos"], zona: ["Lima Metropolitana", "Junín"], comision: 0.07, email: "ventas@lacteosmantaro.pe", contacto: "Hilda Poma" },
  { clave: "laParada", razonSocial: "Frutas y Verduras La Parada Express E.I.R.L.", ruc10: "2060567890", tipo: "Mayorista", categorias: ["frescos"], zona: ["Lima Centro", "Lima Moderna"], comision: 0.08, email: "ventas@laparadaexpress.pe", contacto: "Óscar Ramos" },
  { clave: "carnesSur", razonSocial: "Carnes Selectas del Sur S.A.C.", ruc10: "2053678901", tipo: "Distribuidor", categorias: ["carnes"], zona: ["Lima Moderna", "Lima Sur"], comision: 0.06, email: "ventas@carnesselectas.pe", contacto: "Andrés Salas" },
  { clave: "andesExpress", razonSocial: "Distribuidora Andes Express S.A.C.", ruc10: "2060678901", tipo: "Distribuidor", categorias: ["abarrotes"], zona: ["Lima Este"], comision: 0.06, email: "ventas@andesexpress.pe", contacto: "Teresa Llanos", estado: "PENDIENTE" },
];

/** Proveedores habituales por categoría (el orden rota quién tiene la mejor oferta). */
export const POOL_POR_CATEGORIA: Record<SlugCategoria, string[]> = {
  abarrotes: ["santaAnita", "pacifico", "limaNorte", "molino"],
  bebidas: ["santaAnita", "aguasSur", "limaNorte"],
  "cafe-oficina": ["pacifico", "cafeSelva", "limaNorte"],
  "limpieza-higiene": ["limaNorte", "higiene", "ecopack"],
  descartables: ["higiene", "ecopack", "limaNorte"],
  frescos: ["laParada", "santaAnita", "avicola", "pacifico"],
  lacteos: ["mantaro", "pacifico", "limaNorte"],
  carnes: ["carnesSur", "avicola", "santaAnita"],
};

export interface ProductoSemilla {
  nombre: string;
  categoria: SlugCategoria;
  unidad: string;
  unidadPlural: string;
  emoji: string;
  /** Precio de referencia (mejor oferta aproximada). */
  precio: number;
  /** Precios exactos por proveedor (prioridad sobre el generador). */
  fijos?: Record<string, number>;
  /** Venta retail: unidad suelta y cuántas trae la unidad mayorista. */
  retail?: { unidad: string; factor: number };
}

export const PRODUCTOS: ProductoSemilla[] = [
  // Abarrotes
  { nombre: "Arroz extra saco 50 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🍚", precio: 176.5, fijos: { limaNorte: 189.0, molino: 176.5, santaAnita: 182.0 }, retail: { unidad: "kg", factor: 50 } },
  { nombre: "Azúcar rubia saco 50 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🧂", precio: 162, retail: { unidad: "kg", factor: 50 } },
  { nombre: "Aceite vegetal caja 12×1 L", categoria: "abarrotes", unidad: "caja", unidadPlural: "cajas", emoji: "🫒", precio: 92.4, fijos: { limaNorte: 98.0, pacifico: 92.4 }, retail: { unidad: "botella 1 L", factor: 12 } },
  { nombre: "Fideos spaghetti caja 20×500 g", categoria: "abarrotes", unidad: "caja", unidadPlural: "cajas", emoji: "🍝", precio: 49.9, retail: { unidad: "paquete 500 g", factor: 20 } },
  { nombre: "Atún en conserva caja 48 latas", categoria: "abarrotes", unidad: "caja", unidadPlural: "cajas", emoji: "🐟", precio: 228, retail: { unidad: "lata", factor: 48 } },
  { nombre: "Lenteja bebé saco 25 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🫘", precio: 142 },
  { nombre: "Frejol canario saco 25 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🫘", precio: 188 },
  { nombre: "Sal de mesa fardo 25×1 kg", categoria: "abarrotes", unidad: "fardo", unidadPlural: "fardos", emoji: "🧂", precio: 27.5 },
  { nombre: "Harina preparada saco 50 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🌾", precio: 149 },
  { nombre: "Avena en hojuelas caja 24×500 g", categoria: "abarrotes", unidad: "caja", unidadPlural: "cajas", emoji: "🥣", precio: 93, retail: { unidad: "bolsa 500 g", factor: 24 } },
  { nombre: "Quinua blanca saco 25 kg", categoria: "abarrotes", unidad: "saco", unidadPlural: "sacos", emoji: "🌾", precio: 205 },
  { nombre: "Mayonesa doypack 3.8 kg", categoria: "abarrotes", unidad: "unidad", unidadPlural: "unidades", emoji: "🥫", precio: 41.5 },
  // Bebidas
  { nombre: "Agua de mesa bidón 20 L", categoria: "bebidas", unidad: "bidón", unidadPlural: "bidones", emoji: "💧", precio: 11.5, fijos: { aguasSur: 11.5, limaNorte: 12.8 }, retail: { unidad: "bidón", factor: 1 } },
  { nombre: "Agua sin gas paquete 15×625 ml", categoria: "bebidas", unidad: "paquete", unidadPlural: "paquetes", emoji: "🥤", precio: 17.9, retail: { unidad: "botella", factor: 15 } },
  { nombre: "Gaseosa 3 L paquete ×6", categoria: "bebidas", unidad: "paquete", unidadPlural: "paquetes", emoji: "🥤", precio: 44.5 },
  { nombre: "Néctar de durazno caja 12×1 L", categoria: "bebidas", unidad: "caja", unidadPlural: "cajas", emoji: "🧃", precio: 47.5 },
  { nombre: "Bebida rehidratante paquete 12×500 ml", categoria: "bebidas", unidad: "paquete", unidadPlural: "paquetes", emoji: "🧃", precio: 29.9 },
  { nombre: "Agua con gas paquete 15×625 ml", categoria: "bebidas", unidad: "paquete", unidadPlural: "paquetes", emoji: "🫧", precio: 21.9 },
  { nombre: "Chicha morada concentrada 4 L", categoria: "bebidas", unidad: "galonera", unidadPlural: "galoneras", emoji: "🍇", precio: 34.5 },
  // Café y oficina
  { nombre: "Café tostado molido 1 kg", categoria: "cafe-oficina", unidad: "bolsa", unidadPlural: "bolsas", emoji: "☕", precio: 38, fijos: { cafeSelva: 38.0, limaNorte: 44.9 }, retail: { unidad: "bolsa 1 kg", factor: 1 } },
  { nombre: "Café instantáneo frasco 200 g", categoria: "cafe-oficina", unidad: "frasco", unidadPlural: "frascos", emoji: "☕", precio: 23.5 },
  { nombre: "Azúcar en sobres caja ×1000", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "🍬", precio: 54 },
  { nombre: "Té filtrante caja ×100", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "🍵", precio: 11.9 },
  { nombre: "Galletas surtidas caja 48 paquetes", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "🍪", precio: 57.5 },
  { nombre: "Papel bond A4 caja 10 millares", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "📄", precio: 182 },
  { nombre: "Crema para café sobres ×100", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "🥛", precio: 21.5 },
  { nombre: "Edulcorante sobres caja ×500", categoria: "cafe-oficina", unidad: "caja", unidadPlural: "cajas", emoji: "🍬", precio: 31.5 },
  // Limpieza e higiene
  { nombre: "Papel toalla interfoliado caja", categoria: "limpieza-higiene", unidad: "caja", unidadPlural: "cajas", emoji: "🧻", precio: 64, fijos: { higiene: 64.0, ecopack: 69.5 } },
  { nombre: "Papel higiénico jumbo fardo ×12", categoria: "limpieza-higiene", unidad: "fardo", unidadPlural: "fardos", emoji: "🧻", precio: 76 },
  { nombre: "Detergente industrial saco 15 kg", categoria: "limpieza-higiene", unidad: "saco", unidadPlural: "sacos", emoji: "🧺", precio: 112.5, fijos: { higiene: 112.5, limaNorte: 118.0, ecopack: 121.9 } },
  { nombre: "Lejía galonera 4 L", categoria: "limpieza-higiene", unidad: "galonera", unidadPlural: "galoneras", emoji: "🧴", precio: 12.9, retail: { unidad: "galonera", factor: 1 } },
  { nombre: "Jabón líquido para manos galón 3.8 L", categoria: "limpieza-higiene", unidad: "galón", unidadPlural: "galones", emoji: "🧼", precio: 25.5 },
  { nombre: "Desinfectante galonera 3.8 L", categoria: "limpieza-higiene", unidad: "galonera", unidadPlural: "galoneras", emoji: "🧴", precio: 21.9 },
  { nombre: "Bolsas de basura 140 L ×100", categoria: "limpieza-higiene", unidad: "paquete", unidadPlural: "paquetes", emoji: "🗑️", precio: 47 },
  { nombre: "Lavavajilla líquido galón 3.8 L", categoria: "limpieza-higiene", unidad: "galón", unidadPlural: "galones", emoji: "🫧", precio: 27.5 },
  { nombre: "Alcohol en gel galón 3.8 L", categoria: "limpieza-higiene", unidad: "galón", unidadPlural: "galones", emoji: "🧴", precio: 44 },
  // Descartables
  { nombre: "Vasos biodegradables ×1000", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "🥤", precio: 72, fijos: { ecopack: 72.0, higiene: 79.0 } },
  { nombre: "Táperes biodegradables ×500", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "🥡", precio: 162 },
  { nombre: "Cubiertos de madera ×1000", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "🍴", precio: 66 },
  { nombre: "Servilletas paquete 24×300", categoria: "descartables", unidad: "paquete", unidadPlural: "paquetes", emoji: "🧻", precio: 83 },
  { nombre: "Film plástico rollo 300 m", categoria: "descartables", unidad: "rollo", unidadPlural: "rollos", emoji: "🎞️", precio: 35.5 },
  { nombre: "Guantes de nitrilo caja ×100", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "🧤", precio: 24.5 },
  { nombre: "Removedores de madera ×1000", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "🥢", precio: 17.5 },
  { nombre: "Vasos para café 8 oz ×1000", categoria: "descartables", unidad: "caja", unidadPlural: "cajas", emoji: "☕", precio: 118 },
  // Frescos
  { nombre: "Papa blanca saco 50 kg", categoria: "frescos", unidad: "saco", unidadPlural: "sacos", emoji: "🥔", precio: 92, retail: { unidad: "kg", factor: 50 } },
  { nombre: "Cebolla roja saco 50 kg", categoria: "frescos", unidad: "saco", unidadPlural: "sacos", emoji: "🧅", precio: 78 },
  { nombre: "Tomate italiano kg", categoria: "frescos", unidad: "kg", unidadPlural: "kg", emoji: "🍅", precio: 3.2, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Limón sutil kg", categoria: "frescos", unidad: "kg", unidadPlural: "kg", emoji: "🍋", precio: 4.4, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Plátano de seda kg", categoria: "frescos", unidad: "kg", unidadPlural: "kg", emoji: "🍌", precio: 3.7, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Zanahoria saco 40 kg", categoria: "frescos", unidad: "saco", unidadPlural: "sacos", emoji: "🥕", precio: 58 },
  { nombre: "Palta fuerte kg", categoria: "frescos", unidad: "kg", unidadPlural: "kg", emoji: "🥑", precio: 8.5, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Manzana delicia kg", categoria: "frescos", unidad: "kg", unidadPlural: "kg", emoji: "🍎", precio: 5.4, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Huevos de granja jaba ×180", categoria: "frescos", unidad: "jaba", unidadPlural: "jabas", emoji: "🥚", precio: 76, retail: { unidad: "docena", factor: 15 } },
  // Lácteos
  { nombre: "Leche evaporada caja 48 latas", categoria: "lacteos", unidad: "caja", unidadPlural: "cajas", emoji: "🥫", precio: 172, retail: { unidad: "lata", factor: 48 } },
  { nombre: "Yogur bebible 1 L caja ×12", categoria: "lacteos", unidad: "caja", unidadPlural: "cajas", emoji: "🥛", precio: 70, retail: { unidad: "botella 1 L", factor: 12 } },
  { nombre: "Queso fresco kg", categoria: "lacteos", unidad: "kg", unidadPlural: "kg", emoji: "🧀", precio: 17.5, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Mantequilla caja 10×200 g", categoria: "lacteos", unidad: "caja", unidadPlural: "cajas", emoji: "🧈", precio: 73 },
  { nombre: "Leche UHT caja 12×1 L", categoria: "lacteos", unidad: "caja", unidadPlural: "cajas", emoji: "🥛", precio: 49.5, retail: { unidad: "caja 1 L", factor: 12 } },
  { nombre: "Queso edam kg", categoria: "lacteos", unidad: "kg", unidadPlural: "kg", emoji: "🧀", precio: 37.5 },
  // Carnes
  { nombre: "Pollo entero fresco kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🍗", precio: 9.9, fijos: { avicola: 9.9, carnesSur: 10.4 }, retail: { unidad: "kg", factor: 1 } },
  { nombre: "Pechuga de pollo kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🍗", precio: 14.8 },
  { nombre: "Bistec de res kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🥩", precio: 31.5 },
  { nombre: "Carne molida de res kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🥩", precio: 25.5 },
  { nombre: "Chuleta de cerdo kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🥓", precio: 21.5 },
  { nombre: "Filete de bonito kg", categoria: "carnes", unidad: "kg", unidadPlural: "kg", emoji: "🐟", precio: 13.8 },
  { nombre: "Hot dog de pollo paquete 1 kg", categoria: "carnes", unidad: "paquete", unidadPlural: "paquetes", emoji: "🌭", precio: 15.5 },
];

/** Productos con caída de precio esta semana (para alertas de precio). */
export const CAIDAS_DE_PRECIO: Record<string, number> = {
  "Palta fuerte kg": 0.08,
  "Café instantáneo frasco 200 g": 0.06,
  "Lejía galonera 4 L": 0.07,
};

/** Consumo semanal típico por cada 100 personas en una oficina. */
export const CONSUMO_OFICINA: Record<string, number> = {
  "Azúcar en sobres caja ×1000": 1.2,
  "Café tostado molido 1 kg": 5,
  "Agua de mesa bidón 20 L": 14,
  "Papel toalla interfoliado caja": 3,
  "Papel higiénico jumbo fardo ×12": 2.5,
  "Vasos biodegradables ×1000": 1.4,
  "Galletas surtidas caja 48 paquetes": 2,
  "Té filtrante caja ×100": 3,
  "Jabón líquido para manos galón 3.8 L": 2,
  "Desinfectante galonera 3.8 L": 2,
  "Bolsas de basura 140 L ×100": 1,
  "Leche UHT caja 12×1 L": 3,
  "Aceite vegetal caja 12×1 L": 1.5,
  "Pollo entero fresco kg": 25,
  "Papa blanca saco 50 kg": 1,
  "Limón sutil kg": 6,
  "Plátano de seda kg": 12,
  "Manzana delicia kg": 10,
  "Detergente industrial saco 15 kg": 0.5,
  "Lejía galonera 4 L": 2,
};

/** Consumo semanal típico de un restaurante (por local). */
export const CONSUMO_RESTAURANTE: Record<string, number> = {
  "Arroz extra saco 50 kg": 4,
  "Aceite vegetal caja 12×1 L": 3,
  "Pollo entero fresco kg": 60,
  "Filete de bonito kg": 35,
  "Limón sutil kg": 25,
  "Cebolla roja saco 50 kg": 2,
  "Papa blanca saco 50 kg": 3,
  "Tomate italiano kg": 30,
  "Táperes biodegradables ×500": 1,
  "Servilletas paquete 24×300": 1,
  "Lavavajilla líquido galón 3.8 L": 3,
  "Agua de mesa bidón 20 L": 6,
};
