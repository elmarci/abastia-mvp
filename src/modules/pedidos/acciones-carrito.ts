"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { esquemaAgregar, esquemaCantidad, esquemaConfirmar } from "@/modules/pedidos/esquemas";
import { obtenerCarrito } from "@/modules/pedidos/carrito";
import { crearPedido } from "@/modules/pedidos/servicio";

function revalidar() {
  revalidatePath("/comprador", "layout");
}

/** Obtiene (o crea) el carrito del usuario. */
async function carritoDe(usuarioId: string) {
  return prisma.carrito.upsert({ where: { usuarioId }, create: { usuarioId }, update: {} });
}

/** Agrega una oferta al pedido consolidado (o suma la cantidad si ya estaba). */
export async function agregarAlCarrito(entrada: { ofertaId: string; cantidad: number }): Promise<Resultado<{ items: number }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const { ofertaId, cantidad } = esquemaAgregar.parse(entrada);
    const oferta = await prisma.oferta.findFirst({ where: { id: ofertaId, activa: true, proveedor: { estado: "HOMOLOGADO" } } });
    if (!oferta) throw new ErrorNegocio("La oferta no está disponible");
    const carrito = await carritoDe(usuario.id);
    const cuenta = await prisma.itemCarrito.count({ where: { carritoId: carrito.id } });
    // Primer producto agregado: empieza a correr el tiempo de armado (H5)
    if (cuenta === 0) await prisma.carrito.update({ where: { id: carrito.id }, data: { iniciadoEn: new Date() } });
    await prisma.itemCarrito.upsert({
      where: { carritoId_ofertaId: { carritoId: carrito.id, ofertaId } },
      create: { carritoId: carrito.id, ofertaId, cantidad },
      update: { cantidad: { increment: cantidad } },
    });
    revalidar();
    return { items: cuenta + 1 };
  }, "Producto agregado al pedido");
}

export async function actualizarCantidad(itemId: string, cantidad: number): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const valor = esquemaCantidad.parse(cantidad);
    const item = await prisma.itemCarrito.findFirst({ where: { id: itemId, carrito: { usuarioId: usuario.id } } });
    if (!item) throw new ErrorNegocio("El producto ya no está en tu pedido");
    await prisma.itemCarrito.update({ where: { id: item.id }, data: { cantidad: valor } });
    revalidar();
  });
}

export async function cambiarOferta(itemId: string, ofertaId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const item = await prisma.itemCarrito.findFirst({ where: { id: itemId, carrito: { usuarioId: usuario.id } }, include: { oferta: true } });
    if (!item) throw new ErrorNegocio("El producto ya no está en tu pedido");
    const nueva = await prisma.oferta.findFirst({ where: { id: ofertaId, productoId: item.oferta.productoId, activa: true, proveedor: { estado: "HOMOLOGADO" } } });
    if (!nueva) throw new ErrorNegocio("La oferta no está disponible");
    const existente = await prisma.itemCarrito.findUnique({ where: { carritoId_ofertaId: { carritoId: item.carritoId, ofertaId } } });
    if (existente) {
      await prisma.$transaction([
        prisma.itemCarrito.update({ where: { id: existente.id }, data: { cantidad: existente.cantidad + item.cantidad } }),
        prisma.itemCarrito.delete({ where: { id: item.id } }),
      ]);
    } else {
      await prisma.itemCarrito.update({ where: { id: item.id }, data: { ofertaId } });
    }
    revalidar();
  }, "Proveedor actualizado");
}

export async function quitarDelCarrito(itemId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    await prisma.itemCarrito.deleteMany({ where: { id: itemId, carrito: { usuarioId: usuario.id } } });
    revalidar();
  }, "Producto quitado");
}

export async function vaciarCarrito(): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    await prisma.itemCarrito.deleteMany({ where: { carrito: { usuarioId: usuario.id } } });
    await prisma.carrito.updateMany({ where: { usuarioId: usuario.id }, data: { iniciadoEn: null } });
    revalidar();
  }, "Pedido vaciado");
}

/** Confirma el pedido consolidado: crea 1 pedido con 1 subpedido por proveedor. */
export async function confirmarPedido(entrada: { sedeId: string; fechaEntrega: string; metodoPago: "TRANSFERENCIA" | "TARJETA" | "CREDITO_30"; notas?: string }): Promise<Resultado<{ id: string; codigo: string; pendiente: boolean }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const datos = esquemaConfirmar.parse(entrada);
    if (datos.metodoPago === "CREDITO_30") throw new ErrorNegocio("El crédito a 30 días estará disponible próximamente");
    // Aislamiento multiempresa: la sede debe ser de la empresa del usuario
    const sede = await prisma.sede.findFirst({ where: { id: datos.sedeId, empresaId: usuario.empresaId } });
    if (!sede) throw new ErrorNegocio("La sede no pertenece a tu empresa");
    const carrito = await obtenerCarrito(usuario.id);
    if (carrito.items.length === 0) throw new ErrorNegocio("Tu pedido está vacío");
    const conError = carrito.items.find((i) => i.errores.length > 0);
    if (conError) throw new ErrorNegocio(`${conError.producto.nombre}: ${conError.errores[0]}`);

    const segundos = carrito.iniciadoEn ? Math.max(1, Math.round((Date.now() - carrito.iniciadoEn.getTime()) / 1000)) : null;
    const pedido = await crearPedido({
      empresaId: usuario.empresaId,
      sedeId: sede.id,
      creadoPorId: usuario.id,
      canal: usuario.rol === "MAYORISTA" ? "MAYORISTA" : "B2B",
      fechaEntrega: datos.fechaEntrega,
      metodoPago: datos.metodoPago,
      notas: datos.notas,
      segundosArmado: segundos,
      lineas: carrito.items.map((i) => ({
        ofertaId: i.ofertaId,
        productoId: i.producto.id,
        proveedorId: i.proveedor.id,
        cantidad: i.cantidad,
        precioUnitario: i.precioUnitario,
        precioPromedio: i.precioPromedio,
        sugerenciaId: i.sugerenciaId,
      })),
    });
    await prisma.itemCarrito.deleteMany({ where: { carrito: { usuarioId: usuario.id } } });
    await prisma.carrito.update({ where: { usuarioId: usuario.id }, data: { iniciadoEn: null } });
    revalidar();
    return { id: pedido.id, codigo: pedido.codigo, pendiente: pedido.pendiente };
  });
}
