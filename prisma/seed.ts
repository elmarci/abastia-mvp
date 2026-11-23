/**
 * Semilla de AbastIA. Es idempotente: vacía las tablas y vuelve a crear todo.
 * Ejecutar con: pnpm db:seed
 */
import { PrismaClient, type EstadoSubPedido, type CanalPedido, type EstadoAprobacion, type Frecuencia } from "@prisma/client";
import bcrypt from "bcryptjs";
import {
  CAIDAS_DE_PRECIO,
  CATEGORIAS,
  CONSUMO_OFICINA,
  CONSUMO_RESTAURANTE,
  POOL_POR_CATEGORIA,
  PRODUCTOS,
  PROVEEDORES,
} from "./datos";
import { completarRuc } from "../src/lib/negocio/validadores";
import { calendarioEntregas, puntajeLicitacion } from "../src/lib/negocio/licitacion";
import { codigoPedido, ESTADOS_PEDIDO, IGV } from "../src/lib/negocio";

const prisma = new PrismaClient();
const CONTRASENA = "Demo2026!";

// ───────── Utilidades ─────────

/** Generador pseudoaleatorio determinista (mulberry32) para que la semilla sea reproducible. */
function crearAzar(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const azar = crearAzar(2026);
const entre = (min: number, max: number) => Math.floor(azar() * (max - min + 1)) + min;
const r2 = (v: number) => Math.round(v * 100) / 100;
/** Redondea precios a 10 céntimos (o al céntimo si es menor a S/ 10). */
const precioBonito = (v: number) => (v < 10 ? r2(v) : Math.round(v * 10) / 10);
const slug = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

function fechaLima(iso: string, hora = 10, minuto = 0): Date {
  // Lima es UTC-5 todo el año
  return new Date(`${iso}T${String(hora + 5).padStart(2, "0")}:${String(minuto).padStart(2, "0")}:00Z`);
}
function sumarDiasIso(iso: string, dias: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
function lunes(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`);
  const dia = d.getUTCDay();
  return sumarDiasIso(iso, dia === 0 ? -6 : 1 - dia);
}
const soloFecha = (iso: string) => new Date(`${iso}T00:00:00Z`);
const HOY = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());

async function vaciar() {
  const tablas = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`,
  );
  const lista = tablas.map((t) => `"public"."${t.tablename}"`).join(", ");
  if (lista) await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`);
}

// ───────── Tipos internos ─────────
interface OfertaInfo {
  id: string;
  productoId: string;
  producto: string;
  proveedorClave: string;
  proveedorId: string;
  precio: number;
  homologado: boolean;
}

async function main() {
  console.log("🌱 Vaciando tablas…");
  await vaciar();
  const hash = await bcrypt.hash(CONTRASENA, 10);

  // ───────── Categorías y productos ─────────
  const categorias = new Map<string, string>();
  for (let i = 0; i < CATEGORIAS.length; i++) {
    const c = await prisma.categoria.create({ data: { ...CATEGORIAS[i], orden: i } });
    categorias.set(c.slug, c.id);
  }
  const productos = new Map<string, { id: string; unidad: string }>();
  for (const p of PRODUCTOS) {
    const creado = await prisma.producto.create({
      data: {
        nombre: p.nombre,
        slug: slug(p.nombre),
        unidad: p.unidad,
        unidadPlural: p.unidadPlural,
        emoji: p.emoji,
        categoriaId: categorias.get(p.categoria)!,
        descripcion: `${p.nombre}. Producto de alta rotación para empresas e instituciones de Lima.`,
      },
    });
    productos.set(p.nombre, { id: creado.id, unidad: p.unidad });
  }

  // ───────── Proveedores ─────────
  const proveedores = new Map<string, { id: string; homologado: boolean }>();
  for (const p of PROVEEDORES) {
    const homologado = p.estado !== "PENDIENTE";
    const creado = await prisma.proveedor.create({
      data: {
        ruc: completarRuc(p.ruc10),
        razonSocial: p.razonSocial,
        tipo: p.tipo,
        categorias: p.categorias.map((c) => CATEGORIAS.find((x) => x.slug === c)!.nombre),
        zonaReparto: p.zona,
        estado: homologado ? "HOMOLOGADO" : "PENDIENTE",
        comision: p.comision,
        contacto: p.contacto,
        telefono: `9${entre(10000000, 99999999)}`,
        documentos: homologado
          ? ["Ficha RUC", "Licencia de funcionamiento", "Registro sanitario DIGESA", "Constancia BPM"]
          : ["Ficha RUC", "Licencia de funcionamiento"],
        homologadoEn: homologado ? fechaLima("2026-04-15") : null,
        creadoEn: homologado ? fechaLima("2026-04-01") : fechaLima(sumarDiasIso(HOY, -3)),
      },
    });
    proveedores.set(p.clave, { id: creado.id, homologado });
    await prisma.usuario.create({
      data: { nombre: p.contacto, email: p.email, passwordHash: hash, rol: "PROVEEDOR", proveedorId: creado.id },
    });
  }

  // ───────── Ofertas (2 a 4 por producto) ─────────
  console.log("🛒 Creando ofertas…");
  const ofertasPorProducto = new Map<string, OfertaInfo[]>();
  const todasLasOfertas: OfertaInfo[] = [];
  const multiplicadores = [1, 1.2, 1.32, 1.4];
  const contadorCategoria = new Map<string, number>();
  for (const p of PRODUCTOS) {
    const pool = POOL_POR_CATEGORIA[p.categoria];
    const indice = contadorCategoria.get(p.categoria) ?? 0;
    contadorCategoria.set(p.categoria, indice + 1);
    let asignacion: [string, number][];
    if (p.fijos) {
      asignacion = Object.entries(p.fijos);
    } else {
      // Rotamos el pool para que cada proveedor tenga la mejor oferta en algún producto
      const n = Math.min(pool.length, 2 + (indice % 3));
      asignacion = [];
      for (let k = 0; k < n; k++) {
        const clave = pool[(indice + k) % pool.length];
        const variacion = k === 0 ? 1 : multiplicadores[k] + (azar() - 0.5) * 0.04;
        asignacion.push([clave, precioBonito(p.precio * variacion)]);
      }
    }
    const lista: OfertaInfo[] = [];
    for (const [clave, precio] of asignacion) {
      const prov = proveedores.get(clave)!;
      const prod = productos.get(p.nombre)!;
      const oferta = await prisma.oferta.create({
        data: {
          proveedorId: prov.id,
          productoId: prod.id,
          precio,
          stock: p.nombre.startsWith("Arroz") ? 40 + entre(0, 60) : entre(30, 400),
          pedidoMinimo: precio > 100 ? 1 : precio > 20 ? entre(1, 3) : entre(5, 10),
          plazoDias: entre(1, 3),
          precioRetail: p.retail ? precioBonito((precio / p.retail.factor) * 1.28) : null,
          unidadRetail: p.retail?.unidad ?? null,
        },
      });
      const info: OfertaInfo = { id: oferta.id, productoId: prod.id, producto: p.nombre, proveedorClave: clave, proveedorId: prov.id, precio, homologado: true };
      lista.push(info);
      todasLasOfertas.push(info);
    }
    ofertasPorProducto.set(p.nombre, lista);
  }
  // Ofertas del proveedor pendiente de homologación (no aparecen en el catálogo hasta aprobarlo)
  for (const nombre of ["Azúcar rubia saco 50 kg", "Fideos spaghetti caja 20×500 g", "Quinua blanca saco 25 kg", "Lenteja bebé saco 25 kg"]) {
    const ref = PRODUCTOS.find((x) => x.nombre === nombre)!;
    await prisma.oferta.create({
      data: {
        proveedorId: proveedores.get("andesExpress")!.id,
        productoId: productos.get(nombre)!.id,
        precio: precioBonito(ref.precio * 0.97),
        stock: 80,
        pedidoMinimo: 2,
        plazoDias: 2,
      },
    });
  }

  // Historial de precios: 8 semanas; algunas ofertas bajan ≥ 5 % esta semana
  const semanas: string[] = [];
  for (let i = 7; i >= 0; i--) semanas.push(lunes(sumarDiasIso(HOY, -7 * i)));
  const historial: { ofertaId: string; precio: number; fecha: Date }[] = [];
  for (const o of todasLasOfertas) {
    const caida = CAIDAS_DE_PRECIO[o.producto] ?? 0;
    for (let i = 0; i < semanas.length; i++) {
      const esActual = i === semanas.length - 1;
      let precio = o.precio;
      if (!esActual) {
        precio = caida > 0 ? o.precio / (1 - caida) : o.precio * (1 + (azar() - 0.4) * 0.03);
      }
      historial.push({ ofertaId: o.id, precio: r2(precio), fecha: fechaLima(semanas[i], 8) });
    }
  }
  await prisma.historialPrecio.createMany({ data: historial });

  // ───────── Usuarios administrador ─────────
  await prisma.usuario.create({ data: { nombre: "Equipo AbastIA", email: "admin@abastia.pe", passwordHash: hash, rol: "ADMIN" } });

  // ───────── Empresas compradoras ─────────
  console.log("🏢 Creando empresas…");
  const andina = await prisma.empresa.create({
    data: { ruc: completarRuc("2060987654"), razonSocial: "Oficinas Andina S.A.C.", tipo: "OFICINA", distrito: "San Isidro", plan: "PRO", minutosCompraBase: 180, creadoEn: fechaLima("2026-04-20") },
  });
  const andinaSI = await prisma.sede.create({
    data: { empresaId: andina.id, nombre: "Sede San Isidro", direccion: "Av. Las Camelias 780, piso 8", distrito: "San Isidro", personas: 120, personasBase: 120, montoLimiteAprobacion: 3000 },
  });
  const andinaSurco = await prisma.sede.create({
    data: { empresaId: andina.id, nombre: "Sede Surco", direccion: "Av. El Derby 254, of. 302", distrito: "Santiago de Surco", personas: 60, personasBase: 60, montoLimiteAprobacion: 2000 },
  });
  const compradorAndina = await prisma.usuario.create({
    data: { nombre: "Lucía Paredes", email: "compras@andina.pe", passwordHash: hash, rol: "COMPRADOR", empresaId: andina.id },
  });
  const aprobadorAndina = await prisma.usuario.create({
    data: { nombre: "Jorge Salazar", email: "gerencia@andina.pe", passwordHash: hash, rol: "APROBADOR", empresaId: andina.id },
  });

  const sabores = await prisma.empresa.create({
    data: { ruc: completarRuc("2061098765"), razonSocial: "Restaurante Sabores del Puerto S.A.C.", tipo: "RESTAURANTE", distrito: "Miraflores", plan: "PRO", minutosCompraBase: 240, creadoEn: fechaLima("2026-05-02") },
  });
  const saboresMira = await prisma.sede.create({
    data: { empresaId: sabores.id, nombre: "Local Miraflores", direccion: "Calle Berlín 455", distrito: "Miraflores", personas: 180, personasBase: 180, montoLimiteAprobacion: 4000 },
  });
  const saboresBarranco = await prisma.sede.create({
    data: { empresaId: sabores.id, nombre: "Local Barranco", direccion: "Av. Grau 312", distrito: "Barranco", personas: 120, personasBase: 120, montoLimiteAprobacion: 3000 },
  });
  const compradorSabores = await prisma.usuario.create({
    data: { nombre: "Miguel Ángel Torres", email: "compras@saboresdelpuerto.pe", passwordHash: hash, rol: "APROBADOR", empresaId: sabores.id },
  });

  const hub = await prisma.empresa.create({
    data: { ruc: completarRuc("2061109876"), razonSocial: "Coworking Miraflores Hub S.A.C.", tipo: "OFICINA", distrito: "Miraflores", plan: "BASICO", minutosCompraBase: 90, creadoEn: fechaLima("2026-06-10") },
  });
  const hubSede = await prisma.sede.create({
    data: { empresaId: hub.id, nombre: "Hub Larco", direccion: "Av. Larco 1150, piso 3", distrito: "Miraflores", personas: 80, personasBase: 80, montoLimiteAprobacion: 1500 },
  });
  const compradorHub = await prisma.usuario.create({
    data: { nombre: "Valeria Chang", email: "compras@mirafloreshub.pe", passwordHash: hash, rol: "COMPRADOR", empresaId: hub.id },
  });

  // [Alcance ampliado] Instituciones, bodega y consumidor final
  const clinica = await prisma.empresa.create({
    data: { ruc: completarRuc("2050765432"), razonSocial: "Clínica San Gabriel S.A.", tipo: "HOSPITAL", distrito: "Jesús María", plan: "CORPORATIVO", minutosCompraBase: 300, creadoEn: fechaLima("2026-07-01") },
  });
  const clinicaSede = await prisma.sede.create({
    data: { empresaId: clinica.id, nombre: "Sede principal", direccion: "Av. Salaverry 2020", distrito: "Jesús María", personas: 350, personasBase: 350, montoLimiteAprobacion: 15000 },
  });
  const compradorClinica = await prisma.usuario.create({
    data: { nombre: "Dra. Mónica Ugarte", email: "compras@clinicasangabriel.pe", passwordHash: hash, rol: "APROBADOR", empresaId: clinica.id },
  });
  const colegio = await prisma.empresa.create({
    data: { ruc: completarRuc("2052876543"), razonSocial: "Colegio Los Pinos S.A.C.", tipo: "COLEGIO", distrito: "La Molina", plan: "PRO", minutosCompraBase: 150, creadoEn: fechaLima("2026-08-05") },
  });
  const colegioSede = await prisma.sede.create({
    data: { empresaId: colegio.id, nombre: "Comedor escolar", direccion: "Av. La Molina 1560", distrito: "La Molina", personas: 600, personasBase: 600, montoLimiteAprobacion: 6000 },
  });
  const compradorColegio = await prisma.usuario.create({
    data: { nombre: "Carmen Ríos", email: "compras@colegiolospinos.pe", passwordHash: hash, rol: "APROBADOR", empresaId: colegio.id },
  });
  const campamento = await prisma.empresa.create({
    data: { ruc: completarRuc("2054987654"), razonSocial: "Campamento Minero Huaraz Alto S.A.C.", tipo: "PROYECTO", distrito: "Huaraz (Áncash)", plan: "CORPORATIVO", minutosCompraBase: 360, creadoEn: fechaLima("2026-08-20") },
  });
  const campamentoSede = await prisma.sede.create({
    data: { empresaId: campamento.id, nombre: "Campamento Huaraz Alto", direccion: "Km 42 carretera Huaraz – Recuay (zona alejada)", distrito: "Huaraz (Áncash)", personas: 200, personasBase: 200, montoLimiteAprobacion: 20000 },
  });
  await prisma.usuario.create({
    data: { nombre: "Ing. Raúl Villanueva", email: "compras@huarazalto.pe", passwordHash: hash, rol: "APROBADOR", empresaId: campamento.id },
  });
  const bodega = await prisma.empresa.create({
    data: { ruc: completarRuc("1045678901"), razonSocial: "Bodega Doña Rosa", tipo: "BODEGA", distrito: "San Martín de Porres", plan: "BASICO", minutosCompraBase: 120, creadoEn: fechaLima("2026-07-15") },
  });
  const bodegaSede = await prisma.sede.create({
    data: { empresaId: bodega.id, nombre: "Bodega", direccion: "Jr. Los Jazmines 214", distrito: "San Martín de Porres", personas: 1, personasBase: 1, montoLimiteAprobacion: 0 },
  });
  const rosa = await prisma.usuario.create({
    data: { nombre: "Rosa Huanca", email: "rosa@bodegarosa.pe", passwordHash: hash, rol: "MAYORISTA", empresaId: bodega.id },
  });
  const consumidor = await prisma.usuario.create({
    data: { nombre: "Carla Mendoza", email: "cliente@correo.pe", passwordHash: hash, rol: "CONSUMIDOR", direccion: "Av. Angamos Oeste 820, dpto. 501", distrito: "Miraflores", telefono: "987654321" },
  });

  // ───────── Consumo semanal (8 semanas) y stock ─────────
  console.log("📈 Creando consumo semanal…");
  const consumos: { sedeId: string; productoId: string; semana: Date; cantidad: number }[] = [];
  const stocks: { sedeId: string; productoId: string; cantidad: number }[] = [];
  const semanasConsumo: string[] = [];
  for (let i = 8; i >= 1; i--) semanasConsumo.push(lunes(sumarDiasIso(HOY, -7 * i)));

  function registrarConsumo(sedeId: string, base: Record<string, number>, factor: number, fijos: Record<string, { serie: number[]; stock: number }> = {}) {
    for (const [nombre, porSemana] of Object.entries(base)) {
      const prod = productos.get(nombre);
      if (!prod) continue;
      const fijo = fijos[nombre];
      const media = porSemana * factor;
      for (let i = 0; i < semanasConsumo.length; i++) {
        const cantidad = fijo ? fijo.serie[i] : Math.max(0, Math.round(media * (0.85 + azar() * 0.3)));
        consumos.push({ sedeId, productoId: prod.id, semana: soloFecha(semanasConsumo[i]), cantidad });
      }
      const stock = fijo ? fijo.stock : Math.round(media * (azar() < 0.25 ? azar() * 0.25 : 0.3 + azar() * 0.9));
      stocks.push({ sedeId, productoId: prod.id, cantidad: stock });
    }
    for (const [nombre, fijo] of Object.entries(fijos)) {
      if (base[nombre] !== undefined) continue;
      const prod = productos.get(nombre)!;
      for (let i = 0; i < semanasConsumo.length; i++) {
        consumos.push({ sedeId, productoId: prod.id, semana: soloFecha(semanasConsumo[i]), cantidad: fijo.serie[i] });
      }
      stocks.push({ sedeId, productoId: prod.id, cantidad: fijo.stock });
    }
  }
  // Oficinas Andina San Isidro: arroz 6, 7, 6, 8 en las últimas 4 semanas y stock 2; pollo con stock 0
  registrarConsumo(andinaSI.id, CONSUMO_OFICINA, 1.2, {
    "Arroz extra saco 50 kg": { serie: [6, 6, 7, 7, 6, 7, 6, 8], stock: 2 },
    "Pollo entero fresco kg": { serie: [28, 30, 31, 29, 30, 32, 29, 31], stock: 0 },
  });
  registrarConsumo(andinaSurco.id, CONSUMO_OFICINA, 0.6, {
    "Arroz extra saco 50 kg": { serie: [3, 3, 4, 3, 3, 4, 3, 4], stock: 1 },
  });
  registrarConsumo(saboresMira.id, CONSUMO_RESTAURANTE, 1.2);
  registrarConsumo(saboresBarranco.id, CONSUMO_RESTAURANTE, 0.8);
  registrarConsumo(hubSede.id, CONSUMO_OFICINA, 0.8);
  registrarConsumo(colegioSede.id, CONSUMO_RESTAURANTE, 2.5);
  registrarConsumo(clinicaSede.id, CONSUMO_RESTAURANTE, 1.8);
  await prisma.consumoSemanal.createMany({ data: consumos });
  await prisma.stockSede.createMany({ data: stocks });

  // ───────── Pedidos ─────────
  console.log("📦 Creando pedidos históricos…");
  const promedioPorProducto = new Map<string, number>();
  for (const [nombre, lista] of ofertasPorProducto) {
    let suma = 0;
    for (const o of lista) suma += o.precio;
    promedioPorProducto.set(nombre, r2(suma / lista.length));
  }
  const mejorPorProducto = new Map<string, OfertaInfo>();
  for (const [nombre, lista] of ofertasPorProducto) {
    mejorPorProducto.set(nombre, [...lista].sort((a, b) => a.precio - b.precio)[0]);
  }
  const comisionPorProveedor = new Map(PROVEEDORES.map((p) => [proveedores.get(p.clave)!.id, p.comision]));
  const calificaciones = new Map<string, number[]>();

  interface Linea {
    oferta: OfertaInfo;
    cantidad: number;
    precio?: number;
  }
  interface OpcionesPedido {
    empresaId: string | null;
    sedeId: string | null;
    creadoPorId: string;
    fecha: Date;
    fechaEntrega: string;
    lineas: Linea[];
    estado: EstadoSubPedido;
    estadosPorProveedor?: Record<string, EstadoSubPedido>;
    aprobacion?: EstadoAprobacion;
    aprobadorId?: string;
    canal?: CanalPedido;
    segundosArmado?: number;
    direccion?: string;
    distrito?: string;
    calificacion?: number;
    actorProveedor?: Map<string, string>;
  }
  const usuariosProveedor = new Map<string, string>();
  for (const u of await prisma.usuario.findMany({ where: { rol: "PROVEEDOR" } })) usuariosProveedor.set(u.proveedorId!, u.id);

  let numeroPedido = 0;
  async function crearPedido(op: OpcionesPedido) {
    numeroPedido++;
    // Agrupamos por proveedor
    const grupos = new Map<string, Linea[]>();
    for (const l of op.lineas) {
      const g = grupos.get(l.oferta.proveedorId) ?? [];
      g.push(l);
      grupos.set(l.oferta.proveedorId, g);
    }
    let total = 0;
    let totalMercado = 0;
    for (const l of op.lineas) {
      const precio = l.precio ?? l.oferta.precio;
      total += precio * l.cantidad;
      totalMercado += Math.max(promedioPorProducto.get(l.oferta.producto)!, precio) * l.cantidad;
    }
    total = r2(total);
    const subtotal = r2(total / (1 + IGV));
    const aprobacion = op.aprobacion ?? "NO_REQUIERE";
    const pedido = await prisma.pedido.create({
      data: {
        canal: op.canal ?? "B2B",
        empresaId: op.empresaId,
        sedeId: op.sedeId,
        creadoPorId: op.creadoPorId,
        fechaEntrega: soloFecha(op.fechaEntrega),
        subtotal,
        igv: r2(total - subtotal),
        total,
        totalMercado: r2(totalMercado),
        ahorro: r2(Math.max(0, totalMercado - total)),
        metodoPago: azar() < 0.7 ? "TRANSFERENCIA" : "TARJETA",
        estadoAprobacion: aprobacion,
        aprobadoPorId: aprobacion === "APROBADO" ? op.aprobadorId : null,
        aprobadoEn: aprobacion === "APROBADO" ? new Date(op.fecha.getTime() + 3600_000) : null,
        segundosArmado: op.segundosArmado ?? entre(780, 2100),
        direccionEntrega: op.direccion,
        distritoEntrega: op.distrito,
        creadoEn: op.fecha,
      },
    });
    await prisma.eventoEstado.create({
      data: { pedidoId: pedido.id, estado: "CREADO", descripcion: `Pedido ${codigoPedido(pedido.numero)} creado`, usuarioId: op.creadoPorId, fecha: op.fecha },
    });
    if (aprobacion === "PENDIENTE") {
      await prisma.eventoEstado.create({
        data: { pedidoId: pedido.id, estado: "PENDIENTE_APROBACION", descripcion: "Supera el monto límite de la sede: requiere aprobación", fecha: op.fecha },
      });
    }
    if (aprobacion === "APROBADO") {
      await prisma.eventoEstado.create({
        data: { pedidoId: pedido.id, estado: "APROBADO", descripcion: "Pedido aprobado por gerencia", usuarioId: op.aprobadorId, fecha: new Date(op.fecha.getTime() + 3600_000) },
      });
    }
    for (const [proveedorId, lineas] of grupos) {
      let t = 0;
      for (const l of lineas) t += (l.precio ?? l.oferta.precio) * l.cantidad;
      t = r2(t);
      const st = r2(t / (1 + IGV));
      const estado = aprobacion === "PENDIENTE" ? "RECIBIDO" : (op.estadosPorProveedor?.[proveedorId] ?? op.estado);
      const sub = await prisma.subPedido.create({
        data: {
          pedidoId: pedido.id,
          proveedorId,
          estado,
          subtotal: st,
          igv: r2(t - st),
          total: t,
          comision: comisionPorProveedor.get(proveedorId) ?? 0.06,
          motivoRechazo: estado === "RECHAZADO" ? "Sin stock suficiente para la fecha solicitada" : null,
          items: {
            create: lineas.map((l) => ({
              productoId: l.oferta.productoId,
              ofertaId: l.oferta.id,
              cantidad: l.cantidad,
              precioUnitario: l.precio ?? l.oferta.precio,
              precioPromedio: promedioPorProducto.get(l.oferta.producto)!,
            })),
          },
        },
      });
      // Historial auditable de estados
      const actor = usuariosProveedor.get(proveedorId);
      let momento = op.fecha.getTime() + 2 * 3600_000;
      await prisma.eventoEstado.create({
        data: { pedidoId: pedido.id, subPedidoId: sub.id, estado: "RECIBIDO", descripcion: "Subpedido recibido por el proveedor", fecha: new Date(momento) },
      });
      if (estado === "RECHAZADO" || estado === "CANCELADO") {
        await prisma.eventoEstado.create({
          data: { pedidoId: pedido.id, subPedidoId: sub.id, estado, descripcion: estado === "RECHAZADO" ? "Rechazado: sin stock suficiente para la fecha solicitada" : "Cancelado por el comprador", usuarioId: actor, fecha: new Date(momento + 3600_000) },
        });
        continue;
      }
      const hasta = ESTADOS_PEDIDO.indexOf(estado as (typeof ESTADOS_PEDIDO)[number]);
      const descripciones = ["", "Confirmado por el proveedor", "En preparación en almacén", "En camino a la sede", "Entregado en la sede"];
      for (let k = 1; k <= hasta; k++) {
        momento += entre(3, 14) * 3600_000;
        await prisma.eventoEstado.create({
          data: { pedidoId: pedido.id, subPedidoId: sub.id, estado: ESTADOS_PEDIDO[k], descripcion: descripciones[k], usuarioId: actor, fecha: new Date(momento) },
        });
      }
      if (estado === "ENTREGADO") {
        const nota = op.calificacion ?? (azar() < 0.75 ? 5 : 4);
        const conforme = azar() > 0.08;
        await prisma.recepcion.create({
          data: {
            subPedidoId: sub.id,
            conforme,
            calificacion: conforme ? nota : 3,
            tipoObservacion: conforme ? null : "Producto dañado",
            observacion: conforme ? null : "Dos unidades llegaron con el empaque roto",
            fecha: new Date(momento + 3600_000),
          },
        });
        const lista = calificaciones.get(proveedorId) ?? [];
        lista.push(conforme ? nota : 3);
        calificaciones.set(proveedorId, lista);
      }
    }
    return pedido;
  }

  /** Arma líneas con las mejores ofertas y ajusta cantidades para acercarse a un monto objetivo. */
  function armarLineas(nombres: string[], objetivo: number, alterna = 0): Linea[] {
    const lineas: Linea[] = [];
    for (let i = 0; i < nombres.length; i++) {
      const lista = ofertasPorProducto.get(nombres[i])!;
      // A veces se compra a un proveedor que no es el más barato (por plazo o costumbre)
      const ordenadas = [...lista].sort((a, b) => a.precio - b.precio);
      const oferta = alterna > 0 && i % alterna === 0 && ordenadas.length > 1 ? ordenadas[1] : ordenadas[0];
      lineas.push({ oferta, cantidad: 1 });
    }
    // Repartimos el objetivo entre las líneas
    const porLinea = objetivo / lineas.length;
    for (const l of lineas) l.cantidad = Math.max(1, Math.round(porLinea / l.oferta.precio));
    // Ajuste fino con la línea de menor precio
    let total = lineas.reduce((s, l) => s + l.oferta.precio * l.cantidad, 0);
    const barata = [...lineas].sort((a, b) => a.oferta.precio - b.oferta.precio)[0];
    const ajuste = Math.round((objetivo - total) / barata.oferta.precio);
    barata.cantidad = Math.max(1, barata.cantidad + ajuste);
    total = lineas.reduce((s, l) => s + l.oferta.precio * l.cantidad, 0);
    return lineas;
  }

  // Canasta típica de oficina (cubre a los 12 proveedores homologados)
  const canastaOficinaA = ["Arroz extra saco 50 kg", "Café tostado molido 1 kg", "Agua de mesa bidón 20 L", "Papel toalla interfoliado caja", "Vasos biodegradables ×1000", "Pollo entero fresco kg", "Leche UHT caja 12×1 L"];
  const canastaOficinaB = ["Aceite vegetal caja 12×1 L", "Galletas surtidas caja 48 paquetes", "Papel higiénico jumbo fardo ×12", "Plátano de seda kg", "Queso fresco kg", "Bistec de res kg", "Azúcar en sobres caja ×1000"];
  const canastaOficinaC = ["Agua de mesa bidón 20 L", "Café tostado molido 1 kg", "Detergente industrial saco 15 kg", "Manzana delicia kg", "Gaseosa 3 L paquete ×6", "Filete de bonito kg", "Servilletas paquete 24×300"];
  const canastaRest = ["Arroz extra saco 50 kg", "Aceite vegetal caja 12×1 L", "Pollo entero fresco kg", "Filete de bonito kg", "Limón sutil kg", "Cebolla roja saco 50 kg", "Táperes biodegradables ×500", "Papa blanca saco 50 kg", "Carne molida de res kg"];

  // Oficinas Andina: gasto mensual descendente de S/ 11,850 a S/ 9,870 (mayo a octubre 2026)
  const metasAndina = [11850, 11450, 11050, 10650, 10250, 9870];
  const meses = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  const diasPedido = ["04", "11", "18", "25"];
  const pedidosAndina: { id: string; lineas: Linea[] }[] = [];
  for (let m = 0; m < meses.length; m++) {
    const canastas = [canastaOficinaA, canastaOficinaB, canastaOficinaC, canastaOficinaA];
    const porPedido = metasAndina[m] / 4;
    for (let k = 0; k < 4; k++) {
      const fechaIso = `${meses[m]}-${diasPedido[k]}`;
      const sede = k % 2 === 0 ? andinaSI : andinaSurco;
      const lineas = armarLineas(canastas[k], porPedido, m === 0 ? 4 : 0);
      const totalPedido = lineas.reduce((s, l) => s + l.oferta.precio * l.cantidad, 0);
      const limite = sede.id === andinaSI.id ? 3000 : 2000;
      const p = await crearPedido({
        empresaId: andina.id,
        sedeId: sede.id,
        creadoPorId: compradorAndina.id,
        fecha: fechaLima(fechaIso, 9, entre(0, 59)),
        fechaEntrega: sumarDiasIso(fechaIso, 2),
        lineas,
        estado: "ENTREGADO",
        aprobacion: totalPedido > limite ? "APROBADO" : "NO_REQUIERE",
        aprobadorId: aprobadorAndina.id,
        segundosArmado: m < 2 ? entre(1800, 2700) : entre(600, 1500),
      });
      pedidosAndina.push({ id: p.id, lineas });
    }
  }

  // Sugerencias de la IA registradas en pedidos históricos de Andina (para H2)
  const sugerencias: { sedeId: string; productoId: string; pedidoId: string; personas: number; dias: number; stock: number; pronostico: number; cantidadSugerida: number; cantidadComprada: number; aceptada: boolean; creadoEn: Date }[] = [];
  for (let i = 8; i < pedidosAndina.length; i++) {
    const p = pedidosAndina[i];
    for (const l of p.lineas.slice(0, 3)) {
      const aceptada = azar() < 0.72;
      const comprada = l.cantidad;
      const sugerida = aceptada ? comprada : Math.max(1, comprada + (azar() < 0.5 ? -1 : 2));
      sugerencias.push({
        sedeId: andinaSI.id,
        productoId: l.oferta.productoId,
        pedidoId: p.id,
        personas: 120,
        dias: 7,
        stock: entre(0, 3),
        pronostico: sugerida * 0.9,
        cantidadSugerida: sugerida,
        cantidadComprada: comprada,
        aceptada: sugerida === comprada,
        creadoEn: new Date(),
      });
    }
  }
  await prisma.sugerenciaIA.createMany({ data: sugerencias });

  // Restaurante Sabores del Puerto: 2 pedidos por mes
  for (let m = 0; m < meses.length; m++) {
    for (const dia of ["06", "20"]) {
      const fechaIso = `${meses[m]}-${dia}`;
      await crearPedido({
        empresaId: sabores.id,
        sedeId: dia === "06" ? saboresMira.id : saboresBarranco.id,
        creadoPorId: compradorSabores.id,
        fecha: fechaLima(fechaIso, 8),
        fechaEntrega: sumarDiasIso(fechaIso, 1),
        lineas: armarLineas(canastaRest, 2600 + entre(-300, 300)),
        estado: "ENTREGADO",
      });
    }
  }
  // Coworking Miraflores Hub (plan Básico): pedidos desde junio
  for (const fechaIso of ["2026-06-15", "2026-07-03", "2026-08-05", "2026-09-07", "2026-10-06"]) {
    await crearPedido({
      empresaId: hub.id,
      sedeId: hubSede.id,
      creadoPorId: compradorHub.id,
      fecha: fechaLima(fechaIso, 11),
      fechaEntrega: sumarDiasIso(fechaIso, 2),
      lineas: armarLineas(["Café tostado molido 1 kg", "Agua de mesa bidón 20 L", "Vasos para café 8 oz ×1000", "Galletas surtidas caja 48 paquetes"], 900),
      estado: "ENTREGADO",
    });
  }
  // Clínica: 2 pedidos (julio)
  for (const fechaIso of ["2026-07-08", "2026-07-29", "2026-09-10"]) {
    await crearPedido({
      empresaId: clinica.id,
      sedeId: clinicaSede.id,
      creadoPorId: compradorClinica.id,
      fecha: fechaLima(fechaIso, 9),
      fechaEntrega: sumarDiasIso(fechaIso, 2),
      lineas: armarLineas(["Leche evaporada caja 48 latas", "Avena en hojuelas caja 24×500 g", "Pollo entero fresco kg", "Manzana delicia kg", "Guantes de nitrilo caja ×100"], 6500),
      estado: "ENTREGADO",
    });
  }
  // Colegio: un pedido (sin recompra en 30 días)
  await crearPedido({
    empresaId: colegio.id,
    sedeId: colegioSede.id,
    creadoPorId: compradorColegio.id,
    fecha: fechaLima("2026-08-12", 10),
    fechaEntrega: "2026-08-14",
    lineas: armarLineas(["Arroz extra saco 50 kg", "Pollo entero fresco kg", "Lenteja bebé saco 25 kg", "Plátano de seda kg"], 5200),
    estado: "ENTREGADO",
  });
  // Bodega Doña Rosa (canal mayorista)
  for (const fechaIso of ["2026-08-03", "2026-08-24", "2026-09-21", "2026-10-19"]) {
    await crearPedido({
      empresaId: bodega.id,
      sedeId: bodegaSede.id,
      creadoPorId: rosa.id,
      canal: "MAYORISTA",
      fecha: fechaLima(fechaIso, 7),
      fechaEntrega: sumarDiasIso(fechaIso, 1),
      lineas: armarLineas(["Aceite vegetal caja 12×1 L", "Fideos spaghetti caja 20×500 g", "Atún en conserva caja 48 latas", "Gaseosa 3 L paquete ×6"], 1800),
      estado: "ENTREGADO",
    });
  }
  // Consumidor final (retail)
  for (const fechaIso of ["2026-10-02", "2026-10-16"]) {
    const nombres = ["Palta fuerte kg", "Pollo entero fresco kg", "Queso fresco kg"];
    const lineas: Linea[] = nombres.map((n) => {
      const o = mejorPorProducto.get(n)!;
      const ref = PRODUCTOS.find((x) => x.nombre === n)!;
      return { oferta: o, cantidad: entre(1, 3), precio: precioBonito((o.precio / (ref.retail?.factor ?? 1)) * 1.28) };
    });
    await crearPedido({
      empresaId: null,
      sedeId: null,
      creadoPorId: consumidor.id,
      canal: "RETAIL",
      fecha: fechaLima(fechaIso, 19),
      fechaEntrega: sumarDiasIso(fechaIso, 1),
      lineas,
      estado: "ENTREGADO",
      direccion: "Av. Angamos Oeste 820, dpto. 501",
      distrito: "Miraflores",
    });
  }

  // ───────── Pedidos de noviembre en distintos estados ─────────
  console.log("🚚 Creando pedidos en curso…");
  const limaNorte = proveedores.get("limaNorte")!.id;
  const detergenteLimaNorte = ofertasPorProducto.get("Detergente industrial saco 15 kg")!.find((o) => o.proveedorClave === "limaNorte")!;
  // Pedido con subpedido de Lima Norte por S/ 1,180.00 (10 × S/ 118.00) para mostrar la liquidación de S/ 940.00
  await crearPedido({
    empresaId: andina.id,
    sedeId: andinaSurco.id,
    creadoPorId: compradorAndina.id,
    fecha: fechaLima(sumarDiasIso(HOY, -12), 10),
    fechaEntrega: sumarDiasIso(HOY, -10),
    lineas: [{ oferta: detergenteLimaNorte, cantidad: 10 }],
    estado: "ENTREGADO",
    aprobacion: "NO_REQUIERE",
  });
  const enCurso: { dias: number; canasta: string[]; estado: EstadoSubPedido; sede: string; objetivo: number }[] = [
    { dias: -9, canasta: canastaOficinaB, estado: "ENTREGADO", sede: andinaSI.id, objetivo: 2600 },
    { dias: -6, canasta: canastaOficinaC, estado: "EN_CAMINO", sede: andinaSI.id, objetivo: 2400 },
    { dias: -3, canasta: ["Agua de mesa bidón 20 L", "Café tostado molido 1 kg", "Leche UHT caja 12×1 L", "Plátano de seda kg"], estado: "EN_PREPARACION", sede: andinaSurco.id, objetivo: 1200 },
    { dias: -1, canasta: ["Papel toalla interfoliado caja", "Vasos biodegradables ×1000", "Azúcar en sobres caja ×1000"], estado: "CONFIRMADO", sede: andinaSI.id, objetivo: 900 },
  ];
  for (const e of enCurso) {
    const fechaIso = sumarDiasIso(HOY, e.dias);
    const lineas = armarLineas(e.canasta, e.objetivo);
    const prov = lineas[0].oferta.proveedorId;
    await crearPedido({
      empresaId: andina.id,
      sedeId: e.sede,
      creadoPorId: compradorAndina.id,
      fecha: fechaLima(fechaIso, 9),
      fechaEntrega: sumarDiasIso(fechaIso, 3),
      lineas,
      estado: e.estado,
      estadosPorProveedor: e.estado === "EN_CAMINO" ? { [prov]: "ENTREGADO" } : undefined,
    });
  }
  // Pedido de Lima Norte recién recibido (para que el proveedor demo lo avance)
  await crearPedido({
    empresaId: sabores.id,
    sedeId: saboresMira.id,
    creadoPorId: compradorSabores.id,
    fecha: fechaLima(sumarDiasIso(HOY, -1), 16),
    fechaEntrega: sumarDiasIso(HOY, 2),
    lineas: [
      { oferta: ofertasPorProducto.get("Aceite vegetal caja 12×1 L")!.find((o) => o.proveedorId === limaNorte)!, cantidad: 6 },
      { oferta: ofertasPorProducto.get("Agua de mesa bidón 20 L")!.find((o) => o.proveedorId === limaNorte)!, cantidad: 20 },
    ],
    estado: "RECIBIDO",
  });
  // Un subpedido rechazado y un pedido cancelado
  await crearPedido({
    empresaId: hub.id,
    sedeId: hubSede.id,
    creadoPorId: compradorHub.id,
    fecha: fechaLima(sumarDiasIso(HOY, -15), 12),
    fechaEntrega: sumarDiasIso(HOY, -13),
    lineas: armarLineas(["Café tostado molido 1 kg", "Agua de mesa bidón 20 L"], 600),
    estado: "ENTREGADO",
    estadosPorProveedor: { [proveedores.get("aguasSur")!.id]: "RECHAZADO" },
  });
  await crearPedido({
    empresaId: sabores.id,
    sedeId: saboresBarranco.id,
    creadoPorId: compradorSabores.id,
    fecha: fechaLima(sumarDiasIso(HOY, -18), 12),
    fechaEntrega: sumarDiasIso(HOY, -16),
    lineas: armarLineas(["Limón sutil kg", "Tomate italiano kg"], 400),
    estado: "CANCELADO",
  });
  // Pedido pendiente de aprobación (supera el límite de S/ 3,000 de la sede San Isidro)
  const pendiente = await crearPedido({
    empresaId: andina.id,
    sedeId: andinaSI.id,
    creadoPorId: compradorAndina.id,
    fecha: fechaLima(HOY, 8, 30),
    fechaEntrega: sumarDiasIso(HOY, 3),
    lineas: armarLineas(["Papel bond A4 caja 10 millares", "Café tostado molido 1 kg", "Detergente industrial saco 15 kg", "Bolsas de basura 140 L ×100"], 4300),
    estado: "RECIBIDO",
    aprobacion: "PENDIENTE",
  });

  // Calificación promedio de proveedores
  for (const [proveedorId, notas] of calificaciones) {
    const prom = notas.reduce((s, n) => s + n, 0) / notas.length;
    await prisma.proveedor.update({ where: { id: proveedorId }, data: { calificacion: r2(prom), numeroCalificaciones: notas.length } });
  }

  // ───────── Notificaciones ─────────
  await prisma.notificacion.createMany({
    data: [
      { usuarioId: compradorAndina.id, titulo: "Pedido en camino", mensaje: "Tu pedido de la sede San Isidro está en camino.", enlace: "/comprador/pedidos" },
      { usuarioId: compradorAndina.id, titulo: "Alerta de precio", mensaje: "La palta fuerte bajó 8 % esta semana.", enlace: "/comprador" },
      { usuarioId: compradorAndina.id, titulo: "Stock bajo", mensaje: "El pollo entero está sin stock en Sede San Isidro.", enlace: "/comprador/planificador" },
      { usuarioId: aprobadorAndina.id, titulo: "Pedido por aprobar", mensaje: `El pedido ${codigoPedido(pendiente.numero)} supera el límite de la sede.`, enlace: "/comprador/aprobaciones" },
      { usuarioId: usuariosProveedor.get(limaNorte)!, titulo: "Nuevo pedido", mensaje: "Restaurante Sabores del Puerto te envió un pedido.", enlace: "/proveedor/pedidos" },
    ],
  });

  // ───────── Leads del piloto ─────────
  const leads = [
    ["Ana Gutiérrez", "Estudio Contable Gutiérrez & Asoc.", "OFICINA", 60],
    ["Luis Fernández", "Cevichería El Muelle", "RESTAURANTE", 150],
    ["Paola Ríos", "Hotel Boutique Miraflores", "HOTEL", 90],
    ["Ricardo Soto", "Constructora Andes Sur", "PROYECTO", 250],
    ["Gabriela León", "Clínica Dental Sonrisa", "OFICINA", 40],
    ["Fernando Díaz", "Pollería La Brasa de Oro", "RESTAURANTE", 220],
    ["Silvia Paz", "Residencia Universitaria Lince", "RESIDENCIA", 140],
    ["Hugo Cáceres", "Colegio San Martín de Surco", "COLEGIO", 800],
    ["Mariela Vidal", "Agencia Digital Pixel", "OFICINA", 55],
    ["Jaime Ortiz", "Chifa Gran Dragón", "RESTAURANTE", 130],
    ["Lorena Campos", "Call Center Atento Sur", "OFICINA", 420],
    ["Eduardo Ramírez", "Panadería Del Barrio", "RESTAURANTE", 70],
  ] as const;
  for (let i = 0; i < leads.length; i++) {
    const [nombre, empresa, tipo, personas] = leads[i];
    await prisma.lead.create({
      data: {
        nombre,
        empresa,
        tipo,
        personas,
        email: `${slug(nombre).split("-")[0]}@${slug(empresa).slice(0, 14)}.pe`,
        telefono: `9${entre(10000000, 99999999)}`,
        creadoEn: fechaLima(sumarDiasIso("2026-04-20", i * 14), 15),
      },
    });
  }

  // ───────── [Alcance ampliado] Escalas de precio (≥ 20 ofertas) ─────────
  console.log("🏷️  Alcance ampliado: escalas, lotes, cotizaciones, licitaciones…");
  const conEscalas = todasLasOfertas.filter((o) => ["limaNorte", "santaAnita", "pacifico", "aguasSur", "higiene", "ecopack"].includes(o.proveedorClave) && !o.producto.startsWith("Arroz")).slice(0, 26);
  const escalas: { ofertaId: string; cantidadMinima: number; precio: number }[] = [];
  for (const o of conEscalas) {
    escalas.push({ ofertaId: o.id, cantidadMinima: 10, precio: r2(o.precio * 0.96) });
    escalas.push({ ofertaId: o.id, cantidadMinima: 50, precio: r2(o.precio * 0.92) });
  }
  await prisma.escalaPrecio.createMany({ data: escalas });

  // Lotes con certificados (trazabilidad)
  const conLote = [
    ["Arroz extra saco 50 kg", "molino", "Molino del Valle, Lambayeque", "Arroz cosechado en el valle de Chancay-Lambayeque y pilado en planta propia."],
    ["Pollo entero fresco kg", "avicola", "Granja Los Andes, Huaral", "Crianza en galpones con control veterinario SENASA; beneficio en planta autorizada."],
    ["Café tostado molido 1 kg", "cafeSelva", "Cooperativa Selva Central, Chanchamayo (Junín)", "Café arábica de altura (1,600 m s. n. m.), tostado medio."],
    ["Leche evaporada caja 48 latas", "mantaro", "Planta Lácteos Mantaro, Concepción (Junín)", "Leche de vacas del valle del Mantaro, esterilizada UHT."],
    ["Agua de mesa bidón 20 L", "aguasSur", "Planta Aguas del Sur, Lurín", "Agua tratada por ósmosis inversa y ozonizada."],
    ["Aceite vegetal caja 12×1 L", "pacifico", "Planta Alimentos Pacífico, Callao", "Aceite vegetal refinado de soya."],
    ["Papa blanca saco 50 kg", "laParada", "Productores de Huánuco", "Papa blanca de primera, seleccionada y lavada."],
    ["Huevos de granja jaba ×180", "avicola", "Granja Los Andes, Huaral", "Huevos frescos de gallinas de postura, clasificados por tamaño."],
    ["Filete de bonito kg", "carnesSur", "Desembarcadero de Pucusana", "Pesca artesanal, cadena de frío continua."],
    ["Queso fresco kg", "mantaro", "Planta Lácteos Mantaro, Concepción (Junín)", "Queso fresco pasteurizado."],
  ] as const;
  const lotes: { codigo: string; productoNombre: string }[] = [];
  for (let i = 0; i < conLote.length; i++) {
    const [nombre, clave, origen, descripcion] = conLote[i];
    const oferta = ofertasPorProducto.get(nombre)!.find((o) => o.proveedorClave === clave) ?? ofertasPorProducto.get(nombre)![0];
    const codigo = `L${HOY.slice(2, 4)}${HOY.slice(5, 7)}-${slug(nombre).slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, "0")}`;
    const produccion = sumarDiasIso(HOY, -entre(2, 20));
    const vence = sumarDiasIso(produccion, nombre.includes("Pollo") || nombre.includes("bonito") ? 7 : nombre.includes("Queso") ? 21 : 300);
    await prisma.lote.create({
      data: {
        codigo,
        ofertaId: oferta.id,
        fechaProduccion: soloFecha(produccion),
        fechaVencimiento: soloFecha(vence),
        origen,
        descripcionOrigen: descripcion,
        certificados: {
          create: [
            { tipo: "Registro sanitario DIGESA", numero: `RS-${entre(10000, 99999)}-${HOY.slice(0, 4)}`, emisor: "DIGESA – Ministerio de Salud", vigencia: soloFecha("2028-12-31") },
            { tipo: "BPM", numero: `BPM-${entre(1000, 9999)}`, emisor: "Certificadora Andina de Calidad (ficticia)", vigencia: soloFecha("2027-06-30") },
            ...(nombre.includes("Pollo") || nombre.includes("Huevos")
              ? [{ tipo: "Autorización sanitaria SENASA", numero: `SENASA-${entre(1000, 9999)}`, emisor: "SENASA", vigencia: soloFecha("2027-12-31") }]
              : []),
          ],
        },
      },
    });
    lotes.push({ codigo, productoNombre: nombre });
  }

  // Solicitudes de cotización (RFQ) con respuestas
  const rfqs = [
    {
      empresa: andina.id,
      sede: andinaSI.id,
      titulo: "Cafetería piso 8 – diciembre",
      categoria: "Café y oficina",
      items: [["Café tostado molido 1 kg", 20], ["Azúcar en sobres caja ×1000", 4], ["Vasos para café 8 oz ×1000", 3]] as const,
      respuestas: [["cafeSelva", 0.97, 2, "Entrega en San Isidro sin costo. Pago a 15 días."], ["limaNorte", 1.02, 1, "Despacho al día siguiente. Pago contra entrega."]] as const,
    },
    {
      empresa: sabores.id,
      sede: saboresMira.id,
      titulo: "Insumos temporada de verano",
      categoria: "Frescos",
      items: [["Limón sutil kg", 120], ["Cebolla roja saco 50 kg", 8], ["Tomate italiano kg", 90]] as const,
      respuestas: [["laParada", 0.95, 1, "Entrega diaria antes de las 7 a. m."], ["santaAnita", 0.99, 1, "Precio fijo por 30 días."]] as const,
    },
  ];
  for (let i = 0; i < rfqs.length; i++) {
    const r = rfqs[i];
    const solicitud = await prisma.solicitudCotizacion.create({
      data: {
        codigo: `COT-${String(i + 1).padStart(4, "0")}`,
        empresaId: r.empresa,
        sedeId: r.sede,
        titulo: r.titulo,
        categoria: r.categoria,
        fechaRequerida: soloFecha(sumarDiasIso(HOY, 7)),
        invitados: { connect: r.respuestas.map(([clave]) => ({ id: proveedores.get(clave)!.id })) },
        items: { create: r.items.map(([nombre, cantidad]) => ({ productoId: productos.get(nombre)!.id, cantidad })) },
      },
      include: { items: { include: { producto: true } } },
    });
    for (const [clave, factor, plazo, condiciones] of r.respuestas) {
      let total = 0;
      const precios = solicitud.items.map((it) => {
        const ref = promedioPorProducto.get(it.producto.nombre)!;
        const precio = precioBonito(ref * factor);
        total += precio * it.cantidad;
        return { itemSolicitudId: it.id, precioUnitario: precio };
      });
      await prisma.cotizacion.create({
        data: { solicitudId: solicitud.id, proveedorId: proveedores.get(clave)!.id, plazoDias: plazo, condiciones, total: r2(total), precios: { create: precios } },
      });
    }
  }

  // Licitación abierta de la Clínica San Gabriel (alimentación de pacientes)
  const criteriosBase = [
    { tipo: "PRECIO" as const, peso: 50 },
    { tipo: "CALIDAD" as const, peso: 25 },
    { tipo: "PLAZO" as const, peso: 15 },
    { tipo: "CALIFICACION" as const, peso: 10 },
  ];
  await prisma.licitacion.create({
    data: {
      codigo: "LIC-0001",
      empresaId: clinica.id,
      titulo: "Alimentación de pacientes 2027: abarrotes, lácteos y frescos",
      descripcion: "Abastecimiento de insumos para la preparación de dietas hospitalarias (350 raciones diarias). Entregas en Av. Salaverry 2020, Jesús María, de 6:00 a 9:00 a. m.",
      certificadosObligatorios: ["Registro sanitario DIGESA", "BPM"],
      plazoContratoMeses: 12,
      frecuencia: "SEMANAL",
      volumenEstimado: "S/ 38,000 mensuales aprox. (arroz, avena, leche evaporada, pollo, frutas)",
      presupuestoReferencial: 456000,
      fechaCierre: fechaLima(sumarDiasIso(HOY, 10), 18),
      criterios: { create: criteriosBase },
      propuestas: {
        create: [
          { proveedorId: proveedores.get("pacifico")!.id, montoTotal: 441600, plazoEntregaDias: 1, certificados: ["Registro sanitario DIGESA", "BPM", "HACCP"], descripcion: "Abastecimiento integral con flota refrigerada propia." },
          { proveedorId: proveedores.get("santaAnita")!.id, montoTotal: 428900, plazoEntregaDias: 2, certificados: ["Registro sanitario DIGESA"], descripcion: "Precios mayoristas de mercado con entrega dos veces por semana." },
        ],
      },
    },
  });

  // Licitación adjudicada del Campamento Minero Huaraz Alto con contrato y calendario
  const inicioContrato = sumarDiasIso(lunes(HOY), -28);
  const propuestasCampamento = [
    { id: "pacifico", montoTotal: 186000, plazoEntregaDias: 3, certificados: ["Registro sanitario DIGESA", "BPM"], calificacion: 4.8 },
    { id: "santaAnita", montoTotal: 179500, plazoEntregaDias: 4, certificados: ["Registro sanitario DIGESA"], calificacion: 4.5 },
  ];
  const evaluacion = puntajeLicitacion(propuestasCampamento, criteriosBase, ["Registro sanitario DIGESA", "BPM"]);
  const ganadora = evaluacion[0].id;
  const licCampamento = await prisma.licitacion.create({
    data: {
      codigo: "LIC-0002",
      empresaId: campamento.id,
      titulo: "Víveres secos y frescos para 200 trabajadores (3 meses)",
      descripcion: "Abastecimiento semanal al campamento (zona alejada, a 42 km de Huaraz). Ciclo de 30 días de víveres para 200 personas.",
      certificadosObligatorios: ["Registro sanitario DIGESA", "BPM"],
      plazoContratoMeses: 3,
      frecuencia: "SEMANAL",
      volumenEstimado: "200 personas × 30 días; ~S/ 60,000 mensuales",
      presupuestoReferencial: 190000,
      fechaCierre: fechaLima(sumarDiasIso(inicioContrato, -7), 18),
      estado: "ADJUDICADA",
      adjudicadaAId: proveedores.get(ganadora)!.id,
      criterios: { create: criteriosBase },
      propuestas: {
        create: propuestasCampamento.map((p) => ({
          proveedorId: proveedores.get(p.id)!.id,
          montoTotal: p.montoTotal,
          plazoEntregaDias: p.plazoEntregaDias,
          certificados: p.certificados,
          descripcion: p.id === "pacifico" ? "Flota 4×4 con cámara de frío; entrega los lunes." : "Entrega en camión tercerizado hasta Huaraz.",
          puntaje: evaluacion.find((e) => e.id === p.id)!.puntaje,
        })),
      },
    },
  });
  const fechasContrato = calendarioEntregas(inicioContrato, 3, "SEMANAL");
  const loteArroz = await prisma.lote.findFirst({ where: { codigo: lotes[0].codigo } });
  await prisma.contrato.create({
    data: {
      codigo: "CTR-0001",
      licitacionId: licCampamento.id,
      empresaId: campamento.id,
      sedeId: campamentoSede.id,
      proveedorId: proveedores.get(ganadora)!.id,
      descripcion: "Contrato de abastecimiento programado: víveres semanales para 200 trabajadores.",
      montoTotal: propuestasCampamento.find((p) => p.id === ganadora)!.montoTotal,
      frecuencia: "SEMANAL",
      inicio: soloFecha(inicioContrato),
      fin: soloFecha(sumarDiasIso(inicioContrato, 90)),
      entregas: {
        create: fechasContrato.map((f) => ({
          fecha: soloFecha(f),
          estado: f < HOY ? "ENTREGADA" : "PROGRAMADA",
          loteId: f < HOY ? loteArroz?.id : null,
          temperatura: f < HOY ? r2(3 + azar() * 2) : null,
        })),
      },
    },
  });

  // Pedido recurrente del Colegio Los Pinos y de Oficinas Andina
  const recurrentes: { empresaId: string; sedeId: string; creadoPorId: string; nombre: string; frecuencia: Frecuencia; dias: number; items: [string, number][] }[] = [
    { empresaId: colegio.id, sedeId: colegioSede.id, creadoPorId: compradorColegio.id, nombre: "Comedor semanal", frecuencia: "SEMANAL", dias: 2, items: [["Arroz extra saco 50 kg", 10], ["Pollo entero fresco kg", 150], ["Plátano de seda kg", 80]] },
    { empresaId: andina.id, sedeId: andinaSI.id, creadoPorId: compradorAndina.id, nombre: "Agua y café quincenal", frecuencia: "QUINCENAL", dias: 5, items: [["Agua de mesa bidón 20 L", 30], ["Café tostado molido 1 kg", 10]] },
  ];
  for (const r of recurrentes) {
    await prisma.pedidoRecurrente.create({
      data: {
        empresaId: r.empresaId,
        sedeId: r.sedeId,
        creadoPorId: r.creadoPorId,
        nombre: r.nombre,
        frecuencia: r.frecuencia,
        proximaEjecucion: soloFecha(sumarDiasIso(HOY, r.dias)),
        items: r.items.map(([nombre, cantidad]) => ({ ofertaId: mejorPorProducto.get(nombre)!.id, cantidad })),
      },
    });
  }

  const totales = {
    productos: await prisma.producto.count(),
    ofertas: await prisma.oferta.count(),
    pedidos: await prisma.pedido.count(),
    lotes: await prisma.lote.count(),
  };
  console.log("✅ Semilla lista:", totales);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
