import { describe, expect, it } from "vitest";
import {
  ahorroPromedio,
  calendarioEntregas,
  cantidadSugerida,
  cantidadValida,
  codigoPedido,
  comisionEnRango,
  competitividad,
  completarRuc,
  diaSemana,
  esFeriado,
  estadoPedidoDerivado,
  explicarSugerencia,
  hoyEnLima,
  IGV,
  liquidacionDetallada,
  lunesDeSemana,
  mejorOferta,
  netoProveedor,
  nivelStock,
  PESOS_PRONOSTICO,
  pesosValidos,
  porcentajeAhorro,
  precioPorVolumen,
  precioPromedio,
  primeraFechaEntrega,
  pronosticoHolt,
  pronosticoSemanal,
  proveedoresActivosEnRango,
  puntajeLicitacion,
  reduccionTiempo,
  requiereAprobacion,
  semaforo,
  siguienteEstado,
  STOCK_SEGURIDAD,
  sumarDias,
  tasaRecompra,
  tasaSugerenciasAceptadas,
  totalesCarrito,
  validarFechaEntrega,
  validarRuc,
} from "@/lib/negocio";

const arroz = [
  { id: "lima-norte", precio: 189.0, stock: 40, homologado: true },
  { id: "molino", precio: 176.5, stock: 25, homologado: true },
  { id: "santa-anita", precio: 182.0, stock: 30, homologado: true },
];

describe("Constantes", () => {
  it("U01 IGV, stock de seguridad y pesos coinciden con el informe", () => {
    expect(IGV).toBe(0.18);
    expect(STOCK_SEGURIDAD).toBe(0.1);
    expect(PESOS_PRONOSTICO).toEqual([0.1, 0.2, 0.3, 0.4]);
  });
});

describe("Catálogo: mejorOferta, precioPromedio y porcentajeAhorro", () => {
  it("U02 arroz: mejor oferta Molino del Valle S/ 176.50", () => {
    expect(mejorOferta(arroz)?.id).toBe("molino");
  });
  it("U03 arroz: precio promedio S/ 182.50", () => {
    expect(precioPromedio(arroz)).toBe(182.5);
  });
  it("U04 arroz: ahorro 3.3 %", () => {
    expect(porcentajeAhorro(182.5, 176.5) * 100).toBeCloseTo(3.29, 2);
    expect((porcentajeAhorro(182.5, 176.5) * 100).toFixed(1)).toBe("3.3");
  });
  it("U05 ignora proveedores sin stock o no homologados", () => {
    const ofertas = [
      { id: "a", precio: 10, stock: 0, homologado: true },
      { id: "b", precio: 9, stock: 5, homologado: false },
      { id: "c", precio: 12, stock: 5, homologado: true },
    ];
    expect(mejorOferta(ofertas)?.id).toBe("c");
    expect(precioPromedio(ofertas)).toBe(11);
  });
  it("U06 sin ofertas: mejor null, promedio 0 y ahorro 0", () => {
    expect(mejorOferta([])).toBeNull();
    expect(precioPromedio([])).toBe(0);
    expect(porcentajeAhorro(0, 10)).toBe(0);
    expect(porcentajeAhorro(10, 12)).toBe(0);
  });
});

describe("Planificador: pronosticoSemanal y cantidadSugerida", () => {
  it("U07 ejemplo del informe: 6, 7, 6, 8 con 120 personas → pronóstico 7.0", () => {
    expect(pronosticoSemanal([6, 7, 6, 8], 120, 120)).toBe(7);
  });
  it("U08 ejemplo del informe: 7 días y stock 2 → 6 sacos", () => {
    expect(cantidadSugerida(7, 7, 2)).toBe(6);
  });
  it("U09 al duplicar personas (240) la sugerencia es 14", () => {
    const p = pronosticoSemanal([6, 7, 6, 8], 240, 120);
    expect(p).toBe(14);
    expect(cantidadSugerida(p, 7, 2)).toBe(14);
  });
  it("U10 usa solo las 4 semanas más recientes", () => {
    expect(pronosticoSemanal([100, 100, 6, 7, 6, 8], 120, 120)).toBe(7);
  });
  it("U11 con menos de 4 semanas renormaliza los pesos", () => {
    expect(pronosticoSemanal([10], 50, 50)).toBe(10);
    expect(pronosticoSemanal([6, 8], 10, 10)).toBeCloseTo((6 * 0.3 + 8 * 0.4) / 0.7, 2);
  });
  it("U12 historial vacío → pronóstico 0 y sugerencia 0", () => {
    expect(pronosticoSemanal([], 120, 120)).toBe(0);
    expect(cantidadSugerida(0, 7, 0)).toBe(0);
  });
  it("U13 stock mayor que la necesidad → 0", () => {
    expect(cantidadSugerida(7, 7, 50)).toBe(0);
  });
  it("U14 cantidades no válidas → 0", () => {
    expect(pronosticoSemanal([6, 7], 0, 120)).toBe(0);
    expect(pronosticoSemanal([6, 7], 120, 0)).toBe(0);
    expect(cantidadSugerida(Number.NaN, 7, 0)).toBe(0);
    expect(cantidadSugerida(7, 0, 0)).toBe(0);
    expect(cantidadSugerida(7, 7, -5)).toBe(cantidadSugerida(7, 7, 0));
  });
  it("U15 14 días duplica la necesidad", () => {
    expect(cantidadSugerida(7, 14, 2)).toBe(Math.ceil(7 * 2 * 1.1 - 2));
  });
  it("U16 pronóstico Holt solo con 8 o más semanas", () => {
    expect(pronosticoHolt([1, 2, 3], 10, 10)).toBeNull();
    expect(pronosticoHolt([1, 2, 3, 4, 5, 6, 7, 8], 0, 10)).toBeNull();
    const holt = pronosticoHolt([10, 10, 10, 10, 10, 10, 10, 10], 20, 10);
    expect(holt).toBeCloseTo(20, 1);
  });
  it("U17 explicación en lenguaje natural", () => {
    const texto = explicarSugerencia({ producto: "Arroz", unidad: "sacos", sugerida: 6, pronostico: 7, personas: 120, stock: 2, dias: 7 });
    expect(texto).toBe("Sugerimos 6 sacos porque consumes ~7 por semana para 120 personas y tienes 2 en stock.");
    expect(explicarSugerencia({ producto: "Arroz", unidad: "sacos", sugerida: 0, pronostico: 7, personas: 120, stock: 20, dias: 7 })).toContain("No necesitas");
  });
});

describe("Nivel de stock", () => {
  it("U18 pollo con stock 0 → Sin stock", () => {
    expect(nivelStock(0, 30)).toBe("SIN_STOCK");
  });
  it("U19 stock < 30 % del consumo semanal → Stock bajo", () => {
    expect(nivelStock(2, 7)).toBe("STOCK_BAJO");
  });
  it("U20 stock suficiente", () => {
    expect(nivelStock(3, 7)).toBe("SUFICIENTE");
    expect(nivelStock(5, 0)).toBe("SUFICIENTE");
  });
});

describe("Carrito: totalesCarrito", () => {
  it("U21 carrito con 3 proveedores: subtotal, IGV 18 %, total y ahorro", () => {
    const t = totalesCarrito([
      { proveedorId: "molino", precioUnitario: 176.5, precioPromedio: 182.5, cantidad: 2 },
      { proveedorId: "aguas", precioUnitario: 11.5, precioPromedio: 12.15, cantidad: 10 },
      { proveedorId: "avicola", precioUnitario: 9.9, precioPromedio: 10.15, cantidad: 20 },
    ]);
    // total = 353 + 115 + 198 = 666.00
    expect(t.total).toBe(666);
    expect(t.subtotal).toBe(564.41);
    expect(t.igv).toBe(101.59);
    expect(t.subtotal + t.igv).toBeCloseTo(t.total, 2);
    // mercado = 365 + 121.5 + 203 = 689.50 → ahorro 23.50
    expect(t.totalMercado).toBe(689.5);
    expect(t.ahorro).toBe(23.5);
    expect(t.numeroProveedores).toBe(3);
    expect(t.numeroItems).toBe(32);
  });
  it("U22 carrito vacío", () => {
    const t = totalesCarrito([]);
    expect(t.total).toBe(0);
    expect(t.porcentajeAhorro).toBe(0);
  });
  it("U23 cantidades no válidas lanzan error", () => {
    expect(() => totalesCarrito([{ proveedorId: "a", precioUnitario: 1, precioPromedio: 1, cantidad: 0 }])).toThrow();
    expect(() => totalesCarrito([{ proveedorId: "a", precioUnitario: 1, precioPromedio: 1, cantidad: 1.5 }])).toThrow();
    expect(cantidadValida(-1)).toBe(false);
    expect(cantidadValida(3)).toBe(true);
  });
  it("U24 sin precio promedio el ahorro es 0", () => {
    const t = totalesCarrito([{ proveedorId: "a", precioUnitario: 10, precioPromedio: 0, cantidad: 1 }]);
    expect(t.ahorro).toBe(0);
  });
});

describe("Proveedor: netoProveedor", () => {
  it("U25 pedido de S/ 1,180.00 con comisión 6 % → neto S/ 940.00", () => {
    expect(netoProveedor(1180, 0.06)).toBe(940);
  });
  it("U26 liquidación detallada", () => {
    expect(liquidacionDetallada(1180, 0.06)).toEqual({ total: 1180, valorVenta: 1000, igv: 180, comision: 60, neto: 940 });
  });
  it("U27 casos límite de comisión", () => {
    expect(netoProveedor(0, 0.06)).toBe(0);
    expect(() => netoProveedor(100, 1)).toThrow();
    expect(() => netoProveedor(100, -0.1)).toThrow();
    expect(comisionEnRango(0.05)).toBe(true);
    expect(comisionEnRango(0.08)).toBe(true);
    expect(comisionEnRango(0.1)).toBe(false);
  });
  it("U28 competitividad frente a la mejor oferta", () => {
    expect(competitividad(176.5, 176.5)).toEqual({ competitivo: true, porEncima: 0 });
    expect(competitividad(189, 176.5).competitivo).toBe(false);
    expect(competitividad(189, 176.5).porEncima).toBeCloseTo(0.0708, 3);
    expect(competitividad(180, 176.5).competitivo).toBe(true);
    expect(competitividad(10, 0).competitivo).toBe(true);
  });
});

describe("Pedidos: estadoPedidoDerivado", () => {
  it("U29 el estado del pedido es el del subpedido menos avanzado", () => {
    expect(estadoPedidoDerivado(["ENTREGADO", "EN_CAMINO", "CONFIRMADO"])).toBe("CONFIRMADO");
  });
  it("U30 pendiente de aprobación tiene prioridad", () => {
    expect(estadoPedidoDerivado(["RECIBIDO"], true)).toBe("PENDIENTE_APROBACION");
  });
  it("U31 ignora rechazados y cancelados salvo que todos lo estén", () => {
    expect(estadoPedidoDerivado(["RECHAZADO", "ENTREGADO"])).toBe("ENTREGADO");
    expect(estadoPedidoDerivado(["RECHAZADO", "RECHAZADO"])).toBe("RECHAZADO");
    expect(estadoPedidoDerivado(["CANCELADO", "RECHAZADO"])).toBe("CANCELADO");
    expect(estadoPedidoDerivado([])).toBe("RECIBIDO");
  });
  it("U32 siguiente estado y aprobación", () => {
    expect(siguienteEstado("RECIBIDO")).toBe("CONFIRMADO");
    expect(siguienteEstado("EN_CAMINO")).toBe("ENTREGADO");
    expect(siguienteEstado("ENTREGADO")).toBeNull();
    expect(siguienteEstado("RECHAZADO")).toBeNull();
    expect(requiereAprobacion(5000, 3000)).toBe(true);
    expect(requiereAprobacion(2000, 3000)).toBe(false);
    expect(requiereAprobacion(2000, null)).toBe(false);
    expect(codigoPedido(7)).toBe("PED-0007");
  });
});

describe("Fechas de entrega", () => {
  it("U33 mínimo el día siguiente, sin domingos ni feriados", () => {
    expect(validarFechaEntrega("2026-11-23", "2026-11-23")).toMatch(/día siguiente/);
    expect(validarFechaEntrega("2026-11-29", "2026-11-23")).toMatch(/domingos/);
    expect(validarFechaEntrega("2026-12-08", "2026-11-23")).toMatch(/feriados/);
    expect(validarFechaEntrega("2026-11-24", "2026-11-23")).toBeNull();
    expect(validarFechaEntrega("no-es-fecha", "2026-11-23")).toMatch(/no es válida/);
  });
  it("U34 primera fecha válida salta domingos y feriados", () => {
    expect(primeraFechaEntrega("2026-11-28")).toBe("2026-11-30");
    expect(primeraFechaEntrega("2026-12-07")).toBe("2026-12-10");
  });
  it("U35 utilidades de fecha", () => {
    expect(sumarDias("2026-12-31", 1)).toBe("2027-01-01");
    expect(diaSemana("2026-11-23")).toBe(1);
    expect(lunesDeSemana("2026-11-29")).toBe("2026-11-23");
    expect(lunesDeSemana("2026-11-25")).toBe("2026-11-23");
    expect(esFeriado("2026-07-28")).toBe(true);
    expect(hoyEnLima(new Date("2026-11-24T03:00:00Z"))).toBe("2026-11-23");
  });
});

describe("Hipótesis H1–H5", () => {
  it("U36 semáforo verde, ámbar, rojo y sin datos", () => {
    expect(semaforo(0.09, 0.08)).toBe("VERDE");
    expect(semaforo(0.07, 0.08)).toBe("AMBAR");
    expect(semaforo(0.02, 0.08)).toBe("ROJO");
    expect(semaforo(null, 0.08)).toBe("SIN_DATOS");
  });
  it("U37 H1 ahorro promedio ponderado", () => {
    expect(ahorroPromedio([{ precioUnitario: 90, precioPromedio: 100, cantidad: 2 }])).toBeCloseTo(0.1);
    expect(ahorroPromedio([])).toBeNull();
  });
  it("U38 H2 sugerencias aceptadas sin modificar", () => {
    expect(
      tasaSugerenciasAceptadas([
        { cantidadSugerida: 6, cantidadComprada: 6 },
        { cantidadSugerida: 4, cantidadComprada: 5 },
        { cantidadSugerida: 3, cantidadComprada: null },
      ]),
    ).toBe(0.5);
    expect(tasaSugerenciasAceptadas([])).toBeNull();
  });
  it("U39 H3 recompra dentro de 30 días", () => {
    const mapa = new Map<string, Date[]>([
      ["a", [new Date("2026-05-01"), new Date("2026-05-20")]],
      ["b", [new Date("2026-05-01"), new Date("2026-07-20")]],
      ["c", [new Date("2026-05-01")]],
      ["d", []],
    ]);
    expect(tasaRecompra(mapa)).toBeCloseTo(1 / 3);
    expect(tasaRecompra(new Map())).toBeNull();
  });
  it("U40 H4 proveedores activos con comisión en rango", () => {
    expect(
      proveedoresActivosEnRango([
        { homologado: true, comision: 0.06, pedidos: 3 },
        { homologado: true, comision: 0.1, pedidos: 3 },
        { homologado: false, comision: 0.06, pedidos: 3 },
        { homologado: true, comision: 0.05, pedidos: 0 },
      ]),
    ).toBe(1);
  });
  it("U41 H5 reducción de tiempo", () => {
    const r = reduccionTiempo([600, 1200], 60);
    expect(r.minutosPromedio).toBe(15);
    expect(r.reduccion).toBe(0.75);
    expect(reduccionTiempo([], 60).reduccion).toBeNull();
  });
});

describe("Validadores", () => {
  it("U42 RUC de 11 dígitos con dígito verificador", () => {
    expect(validarRuc("20100047218")).toBe(true);
    expect(validarRuc("20100047219")).toBe(false);
    expect(validarRuc("123")).toBe(false);
    expect(validarRuc("30100047218")).toBe(false);
    expect(validarRuc(completarRuc("2060123456"))).toBe(true);
  });
});

describe("[Alcance ampliado] Precio por volumen", () => {
  const oferta = {
    precio: 50,
    escalas: [
      { cantidadMinima: 10, precio: 47 },
      { cantidadMinima: 50, precio: 44 },
    ],
  };
  it("U43 aplica la escala alcanzada y calcula cuánto falta", () => {
    expect(precioPorVolumen(oferta, 1)).toMatchObject({ precio: 50, faltan: 9 });
    expect(precioPorVolumen(oferta, 9).precio).toBe(50);
    expect(precioPorVolumen(oferta, 10)).toMatchObject({ precio: 47, faltan: 40 });
    expect(precioPorVolumen(oferta, 50)).toMatchObject({ precio: 44, faltan: 0, siguiente: null });
    expect(precioPorVolumen({ precio: 20 }, 5).precio).toBe(20);
  });
});

describe("[Alcance ampliado] Licitaciones", () => {
  const criterios = [
    { tipo: "PRECIO" as const, peso: 50 },
    { tipo: "CALIDAD" as const, peso: 25 },
    { tipo: "PLAZO" as const, peso: 15 },
    { tipo: "CALIFICACION" as const, peso: 10 },
  ];
  it("U44 el precio más bajo obtiene el puntaje máximo de precio y se ordena", () => {
    const r = puntajeLicitacion(
      [
        { id: "caro", montoTotal: 120000, plazoEntregaDias: 2, certificados: ["BPM", "Registro sanitario"], calificacion: 5 },
        { id: "barato", montoTotal: 100000, plazoEntregaDias: 3, certificados: ["BPM"], calificacion: 4 },
      ],
      criterios,
      ["BPM", "Registro sanitario"],
    );
    const barato = r.find((x) => x.id === "barato");
    expect(barato?.detalle.PRECIO).toBe(50);
    expect(r[0].posicion).toBe(1);
    expect(r[0].puntaje).toBeGreaterThanOrEqual(r[1].puntaje);
    expect(r.find((x) => x.id === "caro")?.detalle.CALIDAD).toBe(25);
  });
  it("U45 pesos que no suman 100 lanzan error; sin propuestas devuelve vacío", () => {
    expect(pesosValidos(criterios)).toBe(true);
    expect(pesosValidos([{ tipo: "PRECIO", peso: 60 }])).toBe(false);
    expect(pesosValidos([{ tipo: "PRECIO", peso: -10 }])).toBe(false);
    expect(() => puntajeLicitacion([{ id: "a", montoTotal: 1, plazoEntregaDias: 1, certificados: [], calificacion: 1 }], [{ tipo: "PRECIO", peso: 60 }], [])).toThrow();
    expect(puntajeLicitacion([], criterios, [])).toEqual([]);
    const sinCert = puntajeLicitacion([{ id: "a", montoTotal: 0, plazoEntregaDias: 0, certificados: [], calificacion: 9 }], criterios, []);
    expect(sinCert[0].detalle.CALIDAD).toBe(25);
  });
  it("U46 calendario de entregas", () => {
    expect(calendarioEntregas("2026-11-02", 1, "SEMANAL")).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(calendarioEntregas("2026-11-02", 2, "MENSUAL")).toHaveLength(2);
    expect(calendarioEntregas("2026-11-02", 1, "QUINCENAL")).toHaveLength(3);
  });
});
