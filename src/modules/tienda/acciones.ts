"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { requerirRol } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { DISTRITOS_LIMA, validarFechaEntrega } from "@/lib/negocio";
import { crearPedido } from "@/modules/pedidos/servicio";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";

const esquemaCompra = z.object({
  items: z.array(z.object({ ofertaId: z.string().min(1), cantidad: z.coerce.number().int().min(1).max(200) })).min(1, "Tu carrito está vacío").max(40),
  direccion: z.string().trim().min(6, "Ingresa tu dirección").max(200),
  distrito: z.enum(DISTRITOS_LIMA as unknown as [string, ...string[]], { errorMap: () => ({ message: "Por ahora solo entregamos en distritos de Lima" }) }),
  fechaEntrega: z.string().superRefine((v, ctx) => {
    const error = validarFechaEntrega(v);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }),
  metodoPago: z.enum(["TARJETA", "TRANSFERENCIA"]),
});

/** [Alcance ampliado] Compra retail del consumidor final con pago simulado. */
export async function comprarRetail(entrada: z.infer<typeof esquemaCompra>): Promise<Resultado<{ id: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirRol(["CONSUMIDOR"]);
    const d = esquemaCompra.parse(entrada);
    const ofertas = await prisma.oferta.findMany({ where: { id: { in: d.items.map((i) => i.ofertaId) }, ...OFERTA_VISIBLE, precioRetail: { not: null } } });
    if (ofertas.length !== new Set(d.items.map((i) => i.ofertaId)).size) throw new ErrorNegocio("Algún producto ya no está disponible. Actualiza la página.");
    // Promedio retail de mercado por producto
    const todas = await prisma.oferta.findMany({ where: { productoId: { in: ofertas.map((o) => o.productoId) }, ...OFERTA_VISIBLE, precioRetail: { not: null } }, select: { productoId: true, precioRetail: true } });
    const lineas = d.items.map((i) => {
      const o = ofertas.find((x) => x.id === i.ofertaId)!;
      const mismas = todas.filter((t) => t.productoId === o.productoId);
      let suma = 0;
      for (const t of mismas) suma += num(t.precioRetail!);
      return { ofertaId: o.id, productoId: o.productoId, proveedorId: o.proveedorId, cantidad: i.cantidad, precioUnitario: num(o.precioRetail!), precioPromedio: Math.round((suma / mismas.length) * 100) / 100 };
    });
    const pedido = await crearPedido({
      empresaId: null,
      sedeId: null,
      creadoPorId: usuario.id,
      canal: "RETAIL",
      fechaEntrega: d.fechaEntrega,
      metodoPago: d.metodoPago,
      direccionEntrega: d.direccion,
      distritoEntrega: d.distrito,
      // El stock del proveedor está en unidades mayoristas; la venta retail no lo descuenta en el MVP
      descontarStock: false,
      lineas,
    });
    await prisma.usuario.update({ where: { id: usuario.id }, data: { direccion: d.direccion, distrito: d.distrito } });
    revalidatePath("/cuenta", "layout");
    return { id: pedido.id };
  }, "¡Compra confirmada! Pago simulado aprobado.");
}
