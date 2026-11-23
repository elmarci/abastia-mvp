"use server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { cantidadSugerida, pronosticoHolt, pronosticoSemanal } from "@/lib/negocio";
import { esquemaStock, esquemaSugerencias } from "@/modules/planificador/esquemas";

/** Verifica que la sede sea de la empresa del usuario y que la empresa tenga plan Pro. */
async function sedePropia(empresaId: string, sedeId: string) {
  const sede = await prisma.sede.findFirst({ where: { id: sedeId, empresaId }, include: { empresa: true } });
  if (!sede) throw new ErrorNegocio("La sede no pertenece a tu empresa");
  if (sede.empresa.plan === "BASICO") throw new ErrorNegocio("El planificador con IA es parte del plan Pro");
  return sede;
}

/** Guarda el stock actual de un producto en la sede. */
export async function guardarStock(entrada: z.infer<typeof esquemaStock>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const datos = esquemaStock.parse(entrada);
    await sedePropia(usuario.empresaId, datos.sedeId);
    await prisma.stockSede.upsert({
      where: { sedeId_productoId: { sedeId: datos.sedeId, productoId: datos.productoId } },
      create: { sedeId: datos.sedeId, productoId: datos.productoId, cantidad: datos.cantidad },
      update: { cantidad: datos.cantidad },
    });
  });
}

/**
 * Registra las sugerencias de la IA y las agrega al pedido.
 * Recalcula en el servidor para que nadie pueda alterar la sugerencia (medición H2).
 */
export async function agregarSugerencias(entrada: z.infer<typeof esquemaSugerencias>): Promise<Resultado<{ agregadas: number }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const datos = esquemaSugerencias.parse(entrada);
    const sede = await sedePropia(usuario.empresaId, datos.sedeId);
    const consumos = await prisma.consumoSemanal.findMany({ where: { sedeId: sede.id, productoId: { in: datos.items.map((i) => i.productoId) } }, orderBy: { semana: "asc" } });

    const carrito = await prisma.carrito.upsert({ where: { usuarioId: usuario.id }, create: { usuarioId: usuario.id }, update: {} });
    const enCarrito = await prisma.itemCarrito.count({ where: { carritoId: carrito.id } });
    if (enCarrito === 0) await prisma.carrito.update({ where: { id: carrito.id }, data: { iniciadoEn: new Date(), sedeId: sede.id } });

    let agregadas = 0;
    for (const item of datos.items) {
      const historial = consumos.filter((c) => c.productoId === item.productoId).map((c) => c.cantidad);
      const holt = datos.modelo === "HOLT" ? pronosticoHolt(historial, datos.personas, sede.personasBase) : null;
      const pronostico = holt ?? pronosticoSemanal(historial, datos.personas, sede.personasBase);
      const sugerida = cantidadSugerida(pronostico, datos.dias, item.stock);
      if (sugerida <= 0) continue;
      const oferta = await prisma.oferta.findFirst({ where: { id: item.ofertaId, productoId: item.productoId, activa: true, proveedor: { estado: "HOMOLOGADO" } } });
      if (!oferta) continue;
      // Actualizamos el stock declarado
      await prisma.stockSede.upsert({
        where: { sedeId_productoId: { sedeId: sede.id, productoId: item.productoId } },
        create: { sedeId: sede.id, productoId: item.productoId, cantidad: item.stock },
        update: { cantidad: item.stock },
      });
      const sugerencia = await prisma.sugerenciaIA.create({
        data: {
          sedeId: sede.id,
          productoId: item.productoId,
          personas: datos.personas,
          dias: datos.dias,
          stock: item.stock,
          pronostico,
          modelo: holt !== null ? "HOLT" : "BASE",
          cantidadSugerida: sugerida,
        },
      });
      // Si el producto ya estaba en el carrito con esa oferta, se reemplaza por la sugerencia
      await prisma.itemCarrito.upsert({
        where: { carritoId_ofertaId: { carritoId: carrito.id, ofertaId: oferta.id } },
        create: { carritoId: carrito.id, ofertaId: oferta.id, cantidad: sugerida, sugerenciaId: sugerencia.id },
        update: { cantidad: sugerida, sugerenciaId: sugerencia.id },
      });
      agregadas++;
    }
    if (agregadas === 0) throw new ErrorNegocio("No hay sugerencias para agregar: tu stock cubre la necesidad");
    revalidatePath("/comprador", "layout");
    return { agregadas };
  });
}
