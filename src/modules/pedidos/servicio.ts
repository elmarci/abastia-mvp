import "server-only";
import { Prisma, type CanalPedido, type MetodoPago } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { ErrorNegocio } from "@/lib/acciones";
import { codigoPedido, IGV, redondear2, requiereAprobacion, totalesCarrito } from "@/lib/negocio";

type Tx = Prisma.TransactionClient;

export interface LineaPedido {
  ofertaId: string | null;
  productoId: string;
  proveedorId: string;
  cantidad: number;
  precioUnitario: number;
  precioPromedio: number;
  sugerenciaId?: string | null;
  loteId?: string | null;
}

export interface DatosNuevoPedido {
  empresaId: string | null;
  sedeId: string | null;
  creadoPorId: string;
  canal: CanalPedido;
  fechaEntrega: string;
  metodoPago: MetodoPago;
  lineas: LineaPedido[];
  segundosArmado?: number | null;
  direccionEntrega?: string | null;
  distritoEntrega?: string | null;
  notas?: string | null;
  /** Los pedidos de contratos y cotizaciones aprobadas no vuelven a pedir aprobación. */
  omitirAprobacion?: boolean;
  /** Descontar stock de las ofertas (por defecto sí). */
  descontarStock?: boolean;
}

/** Crea notificaciones para varios usuarios. */
export async function notificar(tx: Tx | typeof prisma, usuarioIds: string[], titulo: string, mensaje: string, enlace?: string) {
  const unicos = [...new Set(usuarioIds)];
  if (unicos.length === 0) return;
  await tx.notificacion.createMany({ data: unicos.map((usuarioId) => ({ usuarioId, titulo, mensaje, enlace })) });
}

/** Usuarios de un proveedor (para notificarles). */
async function usuariosDeProveedores(tx: Tx, proveedorIds: string[]) {
  const usuarios = await tx.usuario.findMany({ where: { proveedorId: { in: proveedorIds } }, select: { id: true, proveedorId: true } });
  return usuarios;
}

/**
 * Crea un pedido con un subpedido por proveedor. Si el total supera el monto
 * límite de la sede, queda pendiente de aprobación y se notifica al aprobador.
 */
export async function crearPedido(datos: DatosNuevoPedido, txExterna?: Tx) {
  const ejecutarEn = async (tx: Tx) => {
    if (datos.lineas.length === 0) throw new ErrorNegocio("El pedido no tiene productos");
    // Cálculos con la lógica de negocio pura
    const totales = totalesCarrito(datos.lineas);

    let pendiente = false;
    if (!datos.omitirAprobacion && datos.sedeId) {
      const sede = await tx.sede.findUnique({ where: { id: datos.sedeId } });
      pendiente = requiereAprobacion(totales.total, sede ? num(sede.montoLimiteAprobacion) : null);
    }

    const pedido = await tx.pedido.create({
      data: {
        canal: datos.canal,
        empresaId: datos.empresaId,
        sedeId: datos.sedeId,
        creadoPorId: datos.creadoPorId,
        fechaEntrega: new Date(`${datos.fechaEntrega}T00:00:00Z`),
        subtotal: totales.subtotal,
        igv: totales.igv,
        total: totales.total,
        totalMercado: totales.totalMercado,
        ahorro: totales.ahorro,
        metodoPago: datos.metodoPago,
        estadoAprobacion: pendiente ? "PENDIENTE" : "NO_REQUIERE",
        segundosArmado: datos.segundosArmado ?? null,
        direccionEntrega: datos.direccionEntrega ?? null,
        distritoEntrega: datos.distritoEntrega ?? null,
        notas: datos.notas ?? null,
      },
    });
    const codigo = codigoPedido(pedido.numero);
    await tx.eventoEstado.create({
      data: { pedidoId: pedido.id, estado: "CREADO", descripcion: `Pedido ${codigo} creado`, usuarioId: datos.creadoPorId },
    });

    // Agrupamos las líneas por proveedor: un subpedido por proveedor
    const grupos = new Map<string, LineaPedido[]>();
    for (const l of datos.lineas) {
      const g = grupos.get(l.proveedorId) ?? [];
      g.push(l);
      grupos.set(l.proveedorId, g);
    }
    const proveedores = await tx.proveedor.findMany({ where: { id: { in: [...grupos.keys()] } }, select: { id: true, comision: true } });
    for (const [proveedorId, lineas] of grupos) {
      let total = 0;
      for (const l of lineas) total += l.precioUnitario * l.cantidad;
      total = redondear2(total);
      const subtotal = redondear2(total / (1 + IGV));
      const sub = await tx.subPedido.create({
        data: {
          pedidoId: pedido.id,
          proveedorId,
          subtotal,
          igv: redondear2(total - subtotal),
          total,
          comision: proveedores.find((p) => p.id === proveedorId)?.comision ?? 0.06,
          items: {
            create: lineas.map((l) => ({
              productoId: l.productoId,
              ofertaId: l.ofertaId,
              cantidad: l.cantidad,
              precioUnitario: l.precioUnitario,
              precioPromedio: l.precioPromedio,
              loteId: l.loteId ?? null,
            })),
          },
        },
      });
      if (!pendiente) {
        await tx.eventoEstado.create({
          data: { pedidoId: pedido.id, subPedidoId: sub.id, estado: "RECIBIDO", descripcion: "Subpedido recibido por el proveedor" },
        });
      }
    }

    // Descontamos el stock de las ofertas
    if (datos.descontarStock !== false) {
      for (const l of datos.lineas) {
        if (l.ofertaId) await tx.oferta.update({ where: { id: l.ofertaId }, data: { stock: { decrement: l.cantidad } } });
      }
    }

    // Registramos qué sugerencias de la IA se compraron y si se modificaron (H2)
    for (const l of datos.lineas) {
      if (!l.sugerenciaId) continue;
      const sugerencia = await tx.sugerenciaIA.findUnique({ where: { id: l.sugerenciaId } });
      if (sugerencia) {
        await tx.sugerenciaIA.update({
          where: { id: sugerencia.id },
          data: { pedidoId: pedido.id, cantidadComprada: l.cantidad, aceptada: l.cantidad === sugerencia.cantidadSugerida },
        });
      }
    }

    // Notificaciones
    if (pendiente) {
      await tx.eventoEstado.create({
        data: { pedidoId: pedido.id, estado: "PENDIENTE_APROBACION", descripcion: "Supera el monto límite de la sede: requiere aprobación" },
      });
      const aprobadores = await tx.usuario.findMany({ where: { empresaId: datos.empresaId ?? "-", rol: "APROBADOR" }, select: { id: true } });
      await notificar(tx, aprobadores.map((a) => a.id), "Pedido por aprobar", `El pedido ${codigo} (${totales.total.toFixed(2)} soles) supera el monto límite de la sede.`, `/comprador/pedidos/${pedido.id}`);
    } else {
      await avisarProveedores(tx, pedido.id, [...grupos.keys()], codigo);
    }
    return { ...pedido, codigo, pendiente, totales };
  };
  return txExterna ? ejecutarEn(txExterna) : prisma.$transaction(ejecutarEn, { timeout: 20000 });
}

export async function avisarProveedores(tx: Tx, pedidoId: string, proveedorIds: string[], codigo: string) {
  const usuarios = await usuariosDeProveedores(tx, proveedorIds);
  await notificar(tx, usuarios.map((u) => u.id), "Nuevo pedido", `Recibiste el pedido ${codigo}. Revísalo y confírmalo.`, `/proveedor/pedidos/${pedidoId}`);
}

/** Usuarios compradores de la empresa de un pedido (o el consumidor que lo creó). */
export async function compradoresDelPedido(tx: Tx | typeof prisma, pedido: { empresaId: string | null; creadoPorId: string }) {
  if (!pedido.empresaId) return [pedido.creadoPorId];
  const usuarios = await tx.usuario.findMany({ where: { empresaId: pedido.empresaId, rol: { in: ["COMPRADOR", "APROBADOR", "MAYORISTA"] } }, select: { id: true } });
  return [pedido.creadoPorId, ...usuarios.map((u) => u.id)];
}
