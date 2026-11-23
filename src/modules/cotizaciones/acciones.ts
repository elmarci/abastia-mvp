"use server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { requerirEmpresa, requerirProveedor } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { redondear2 } from "@/lib/negocio";
import { crearPedido, notificar } from "@/modules/pedidos/servicio";
import { promediosPorProducto } from "@/modules/catalogo/consultas";
import { esquemaRespuesta, esquemaSolicitud } from "@/modules/cotizaciones/esquemas";

function revalidar() {
  revalidatePath("/comprador/cotizaciones", "layout");
  revalidatePath("/proveedor/cotizaciones");
}

/** El comprador crea una solicitud y la envía a los proveedores elegidos o a todos los de la categoría. */
export async function crearSolicitud(entrada: z.infer<typeof esquemaSolicitud>): Promise<Resultado<{ id: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const datos = esquemaSolicitud.parse(entrada);
    const sede = await prisma.sede.findFirst({ where: { id: datos.sedeId, empresaId: usuario.empresaId } });
    if (!sede) throw new ErrorNegocio("Sede no encontrada");
    const productos = await prisma.producto.findMany({ where: { id: { in: datos.items.map((i) => i.productoId) } }, include: { categoria: true } });
    if (productos.length !== datos.items.length) throw new ErrorNegocio("Hay productos que no existen");

    // Invitados: los elegidos o todos los proveedores homologados que venden esas categorías
    const categorias = [...new Set(productos.map((p) => p.categoriaId))];
    const candidatos = await prisma.proveedor.findMany({
      where: { estado: "HOMOLOGADO", ofertas: { some: { producto: { categoriaId: { in: categorias } } } } },
      select: { id: true },
    });
    let invitados = candidatos.map((c) => c.id);
    if (datos.proveedorIds.length > 0) invitados = invitados.filter((id) => datos.proveedorIds.includes(id));
    if (invitados.length === 0) throw new ErrorNegocio("No hay proveedores homologados para esos productos");

    const total = await prisma.solicitudCotizacion.count();
    const solicitud = await prisma.solicitudCotizacion.create({
      data: {
        codigo: `COT-${String(total + 1).padStart(4, "0")}`,
        empresaId: usuario.empresaId,
        sedeId: sede.id,
        titulo: datos.titulo,
        categoria: [...new Set(productos.map((p) => p.categoria.nombre))].join(", "),
        fechaRequerida: new Date(`${datos.fechaRequerida}T00:00:00Z`),
        invitados: { connect: invitados.map((id) => ({ id })) },
        items: { create: datos.items.map((i) => ({ productoId: i.productoId, cantidad: i.cantidad })) },
      },
    });
    const usuarios = await prisma.usuario.findMany({ where: { proveedorId: { in: invitados } }, select: { id: true } });
    await notificar(prisma, usuarios.map((u) => u.id), "Nueva solicitud de cotización", `${solicitud.codigo}: ${solicitud.titulo}`, "/proveedor/cotizaciones");
    revalidar();
    return { id: solicitud.id };
  }, "Solicitud enviada a los proveedores");
}

/** El proveedor invitado responde (o actualiza) su cotización mientras la solicitud está abierta. */
export async function responderSolicitud(entrada: z.infer<typeof esquemaRespuesta>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const datos = esquemaRespuesta.parse(entrada);
    const solicitud = await prisma.solicitudCotizacion.findFirst({
      where: { id: datos.solicitudId, invitados: { some: { id: usuario.proveedorId } } },
      include: { items: true, empresa: { include: { usuarios: { where: { rol: { in: ["COMPRADOR", "APROBADOR"] } }, select: { id: true } } } } },
    });
    if (!solicitud) throw new ErrorNegocio("Solicitud no encontrada");
    if (solicitud.estado !== "ABIERTA") throw new ErrorNegocio("La solicitud ya está cerrada");
    // Debe cotizar todos los ítems
    let total = 0;
    for (const item of solicitud.items) {
      const precio = datos.precios.find((p) => p.itemSolicitudId === item.id);
      if (!precio) throw new ErrorNegocio("Cotiza todos los productos de la solicitud");
      total += precio.precioUnitario * item.cantidad;
    }
    const precios = solicitud.items.map((i) => ({ itemSolicitudId: i.id, precioUnitario: datos.precios.find((p) => p.itemSolicitudId === i.id)!.precioUnitario }));
    await prisma.$transaction(async (tx) => {
      await tx.cotizacion.deleteMany({ where: { solicitudId: solicitud.id, proveedorId: usuario.proveedorId } });
      await tx.cotizacion.create({
        data: { solicitudId: solicitud.id, proveedorId: usuario.proveedorId, plazoDias: datos.plazoDias, condiciones: datos.condiciones, total: redondear2(total), precios: { create: precios } },
      });
      await notificar(tx, solicitud.empresa.usuarios.map((u) => u.id), "Nueva cotización recibida", `Un proveedor respondió ${solicitud.codigo}.`, `/comprador/cotizaciones/${solicitud.id}`);
    });
    revalidar();
  }, "Cotización enviada");
}

/** Convierte la cotización elegida en un pedido con un clic. */
export async function convertirEnPedido(cotizacionId: string): Promise<Resultado<{ id: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const cotizacion = await prisma.cotizacion.findFirst({
      where: { id: cotizacionId, solicitud: { empresaId: usuario.empresaId } },
      include: { solicitud: true, precios: { include: { itemSolicitud: true } } },
    });
    if (!cotizacion) throw new ErrorNegocio("Cotización no encontrada");
    if (cotizacion.solicitud.estado !== "ABIERTA") throw new ErrorNegocio("Esta solicitud ya se convirtió en pedido");
    const productoIds = cotizacion.precios.map((p) => p.itemSolicitud.productoId);
    const promedios = await promediosPorProducto(productoIds);
    const ofertas = await prisma.oferta.findMany({ where: { proveedorId: cotizacion.proveedorId, productoId: { in: productoIds } }, select: { id: true, productoId: true } });
    const fecha = cotizacion.solicitud.fechaRequerida.toISOString().slice(0, 10);
    const hoy = new Date().toISOString().slice(0, 10);
    const pedido = await prisma.$transaction(async (tx) => {
      const creado = await crearPedido(
        {
          empresaId: usuario.empresaId,
          sedeId: cotizacion.solicitud.sedeId,
          creadoPorId: usuario.id,
          canal: "COTIZACION",
          fechaEntrega: fecha > hoy ? fecha : hoy,
          metodoPago: "TRANSFERENCIA",
          notas: `Desde la cotización ${cotizacion.solicitud.codigo}. Condiciones: ${cotizacion.condiciones}`,
          // El aprobador ya revisó la cotización; un comprador sigue sujeto al monto límite
          omitirAprobacion: usuario.rol === "APROBADOR",
          descontarStock: false,
          lineas: cotizacion.precios.map((p) => {
            const precio = num(p.precioUnitario);
            return {
              ofertaId: ofertas.find((o) => o.productoId === p.itemSolicitud.productoId)?.id ?? null,
              productoId: p.itemSolicitud.productoId,
              proveedorId: cotizacion.proveedorId,
              cantidad: p.itemSolicitud.cantidad,
              precioUnitario: precio,
              precioPromedio: promedios.get(p.itemSolicitud.productoId) ?? precio,
            };
          }),
        },
        tx,
      );
      await tx.solicitudCotizacion.update({ where: { id: cotizacion.solicitudId }, data: { estado: "CONVERTIDA", pedidoId: creado.id } });
      return creado;
    });
    revalidar();
    revalidatePath("/comprador", "layout");
    return { id: pedido.id };
  }, "Pedido creado desde la cotización");
}

/** Cierra una solicitud sin convertirla. */
export async function cerrarSolicitud(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const r = await prisma.solicitudCotizacion.updateMany({ where: { id, empresaId: usuario.empresaId, estado: "ABIERTA" }, data: { estado: "CERRADA" } });
    if (r.count === 0) throw new ErrorNegocio("La solicitud no está abierta");
    revalidar();
  }, "Solicitud cerrada");
}
