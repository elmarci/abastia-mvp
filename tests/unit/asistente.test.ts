import { describe, expect, it } from "vitest";
import { buscarProducto, convertirCantidad, interpretarFecha, interpretarPedido, interpretarSede, normalizar } from "@/lib/negocio";

const PRODUCTOS = [
  { id: "arroz", nombre: "Arroz extra saco 50 kg", unidad: "saco", unidadPlural: "sacos" },
  { id: "agua", nombre: "Agua de mesa bidón 20 L", unidad: "bidón", unidadPlural: "bidones" },
  { id: "aceite", nombre: "Aceite vegetal caja 12×1 L", unidad: "caja", unidadPlural: "cajas" },
  { id: "pollo", nombre: "Pollo entero fresco kg", unidad: "kg", unidadPlural: "kg" },
  { id: "cafe", nombre: "Café tostado molido 1 kg", unidad: "bolsa", unidadPlural: "bolsas" },
];
const SEDES = [
  { id: "si", nombre: "Sede San Isidro", distrito: "San Isidro" },
  { id: "su", nombre: "Sede Surco", distrito: "Santiago de Surco" },
];
// 2026-11-23 es lunes
const HOY = "2026-11-23";

describe("Asistente por reglas [alcance ampliado]", () => {
  it("U47 · interpreta el ejemplo del enunciado: 20 kg de arroz y 10 bidones para San Isidro el jueves", () => {
    const r = interpretarPedido("20 kg de arroz y 10 bidones para San Isidro el jueves", PRODUCTOS, SEDES, HOY);
    expect(r.items).toEqual([
      expect.objectContaining({ productoId: "arroz", cantidad: 1, nota: expect.stringContaining("50 kg") }),
      expect.objectContaining({ productoId: "agua", cantidad: 10 }),
    ]);
    expect(r.sedeId).toBe("si");
    expect(r.fecha).toBe("2026-11-26");
    expect(r.noEntendidos).toEqual([]);
  });

  it("U48 · números en palabras, kg directos y fragmentos no entendidos", () => {
    const r = interpretarPedido("tres cajas de aceite, 12,5 kg de pollo, 4 unicornios", PRODUCTOS, SEDES, HOY);
    expect(r.items.map((i) => [i.productoId, i.cantidad])).toEqual([
      ["aceite", 3],
      ["pollo", 13],
    ]);
    expect(r.noEntendidos).toEqual(["4 unicornios"]);
    expect(r.sedeId).toBeNull();
    expect(r.fecha).toBeNull();
  });

  it("U49 · sin cantidad asume 1 y suma productos repetidos", () => {
    const r = interpretarPedido("café y 2 bolsas de café", PRODUCTOS, SEDES, HOY);
    expect(r.items).toHaveLength(1);
    expect(r.items[0]).toMatchObject({ productoId: "cafe", cantidad: 3 });
  });

  it("U50 · fechas: hoy, mañana, pasado mañana, día igual a hoy y formatos numéricos", () => {
    expect(interpretarFecha("para hoy", HOY)).toBe(HOY);
    expect(interpretarFecha("para mañana", HOY)).toBe("2026-11-24");
    expect(interpretarFecha("pasado mañana", HOY)).toBe("2026-11-25");
    expect(interpretarFecha("el lunes", HOY)).toBe("2026-11-30");
    expect(interpretarFecha("el 2026-12-02", HOY)).toBe("2026-12-02");
    expect(interpretarFecha("el 5/12", HOY)).toBe("2026-12-05");
    expect(interpretarFecha("el 5/1", HOY)).toBe("2027-01-05");
    expect(interpretarFecha("cuando puedas", HOY)).toBeNull();
  });

  it("U51 · sede por distrito, normalización y búsqueda de productos", () => {
    expect(interpretarSede("llevar a santiago de surco", SEDES)).toBe("su");
    expect(normalizar("  Café   BIDÓN ")).toBe("cafe bidon");
    expect(buscarProducto("bidones", PRODUCTOS)?.id).toBe("agua");
    expect(buscarProducto("kg", PRODUCTOS)).toBeNull();
    expect(convertirCantidad(30, "litros", PRODUCTOS[1])).toEqual({ cantidad: 2, nota: "30 L ≈ 2 bidones de 20 L" });
    expect(convertirCantidad(2, null, PRODUCTOS[0])).toEqual({ cantidad: 2, nota: null });
  });
});
