"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { num, soles } from "@/lib/formato";
import { requerirEmpresa } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { hoyEnLima, interpretarPedido, validarFechaEntrega } from "@/lib/negocio";
import { OFERTA_VISIBLE } from "@/modules/catalogo/consultas";
import { esquemaCantidad } from "@/modules/pedidos/esquemas";
import { interpretarConClaude } from "@/modules/asistente/claude";

export interface Propuesta {
  motor: "reglas" | "claude";
  respuesta: string;
  items: { ofertaId: string; producto: string; emoji: string; proveedor: string; cantidad: number; unidadPlural: string; precio: number; nota: string | null }[];
  sede: { id: string; nombre: string } | null;
  fecha: string | null;
  noEntendidos: string[];
}

/** Interpreta el mensaje y arma una propuesta. Nunca crea pedidos por su cuenta. */
export async function preguntarAsistente(texto: string): Promise<Resultado<Propuesta>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const mensaje = z.string().trim().min(2, "Escribe tu pedido").max(500).parse(texto);
    const [productos, sedes] = await Promise.all([
      prisma.producto.findMany({ where: { ofertas: { some: OFERTA_VISIBLE } }, select: { id: true, nombre: true, unidad: true, unidadPlural: true, emoji: true } }),
      prisma.sede.findMany({ where: { empresaId: usuario.empresaId }, select: { id: true, nombre: true, distrito: true } }),
    ]);
    const hoy = hoyEnLima();
    const conClaude = await interpretarConClaude(mensaje, productos, sedes, hoy);
    const interpretacion = conClaude ?? interpretarPedido(mensaje, productos, sedes, hoy);

    // Para cada producto, la mejor oferta disponible (sube al pedido mínimo si hace falta)
    const items: Propuesta["items"] = [];
    for (const it of interpretacion.items) {
      const oferta = await prisma.oferta.findFirst({ where: { productoId: it.productoId, ...OFERTA_VISIBLE, stock: { gt: 0 } }, orderBy: { precio: "asc" }, include: { proveedor: { select: { razonSocial: true } } } });
      const producto = productos.find((p) => p.id === it.productoId)!;
      if (!oferta) {
        interpretacion.noEntendidos.push(`${producto.nombre} (sin stock)`);
        continue;
      }
      const cantidad = Math.max(it.cantidad, oferta.pedidoMinimo);
      items.push({
        ofertaId: oferta.id,
        producto: producto.nombre,
        emoji: producto.emoji,
        proveedor: oferta.proveedor.razonSocial,
        cantidad,
        unidadPlural: producto.unidadPlural,
        precio: num(oferta.precio),
        nota: cantidad > it.cantidad ? `Subido al pedido mínimo (${oferta.pedidoMinimo})` : it.nota,
      });
    }
    const sede = sedes.find((s) => s.id === interpretacion.sedeId) ?? null;
    let total = 0;
    for (const i of items) total += i.precio * i.cantidad;
    const respuesta =
      items.length === 0
        ? "No encontré productos del catálogo en tu mensaje. Prueba con algo como: «20 kg de arroz y 10 bidones para San Isidro el jueves»."
        : `Te propongo ${items.length} ${items.length === 1 ? "producto" : "productos"} por ${soles(total)}${sede ? ` para ${sede.nombre}` : ""}. Revisa y pulsa «Confirmar» para agregarlos a tu pedido.`;
    await prisma.mensajeAsistente.createMany({
      data: [
        { usuarioId: usuario.id, autor: "USUARIO", contenido: mensaje },
        { usuarioId: usuario.id, autor: "ASISTENTE", contenido: respuesta },
      ],
    });
    return { motor: conClaude ? "claude" : "reglas", respuesta, items, sede: sede ? { id: sede.id, nombre: sede.nombre } : null, fecha: interpretacion.fecha, noEntendidos: interpretacion.noEntendidos };
  });
}

const esquemaConfirmar = z.object({
  items: z.array(z.object({ ofertaId: z.string().min(1), cantidad: esquemaCantidad })).min(1).max(30),
  sedeId: z.string().nullable(),
  fecha: z.string().nullable(),
});

/** Solo después de que el usuario pulsa "Confirmar": agrega la propuesta al pedido. */
export async function confirmarPropuesta(entrada: z.infer<typeof esquemaConfirmar>): Promise<Resultado<{ url: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const d = esquemaConfirmar.parse(entrada);
    const ofertas = await prisma.oferta.findMany({ where: { id: { in: d.items.map((i) => i.ofertaId) }, ...OFERTA_VISIBLE } });
    if (ofertas.length !== d.items.length) throw new ErrorNegocio("Alguna oferta ya no está disponible");
    const sede = d.sedeId ? await prisma.sede.findFirst({ where: { id: d.sedeId, empresaId: usuario.empresaId } }) : null;
    const carrito = await prisma.carrito.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id }, update: {} });
    const vacio = (await prisma.itemCarrito.count({ where: { carritoId: carrito.id } })) === 0;
    await prisma.carrito.update({ where: { id: carrito.id }, data: { ...(vacio ? { iniciadoEn: new Date() } : {}), ...(sede ? { sedeId: sede.id } : {}) } });
    for (const i of d.items) {
      await prisma.itemCarrito.upsert({
        where: { carritoId_ofertaId: { carritoId: carrito.id, ofertaId: i.ofertaId } },
        create: { carritoId: carrito.id, ofertaId: i.ofertaId, cantidad: i.cantidad },
        update: { cantidad: { increment: i.cantidad } },
      });
    }
    await prisma.mensajeAsistente.create({ data: { usuarioId: usuario.id, autor: "ASISTENTE", contenido: `Listo: agregué ${d.items.length} productos a tu pedido.` } });
    revalidatePath("/comprador", "layout");
    const fechaValida = d.fecha && !validarFechaEntrega(d.fecha) ? d.fecha : null;
    return { url: `/comprador/carrito${fechaValida ? `?fecha=${fechaValida}` : ""}` };
  }, "Productos agregados a tu pedido");
}
