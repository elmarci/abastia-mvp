"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirProveedor } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { hoyEnLima } from "@/lib/negocio";

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha no válida");

const esquemaLote = z
  .object({
    ofertaId: z.string().min(1, "Elige el producto"),
    fechaProduccion: fecha,
    fechaVencimiento: fecha,
    origen: z.string().trim().min(3, "Indica el origen").max(150),
    descripcionOrigen: z.string().trim().max(300).optional(),
    certificados: z.array(z.object({ tipo: z.string().trim().min(2), numero: z.string().trim().min(2), emisor: z.string().trim().min(2), vigencia: fecha })).max(5),
  })
  .refine((d) => d.fechaVencimiento > d.fechaProduccion, { message: "El vencimiento debe ser posterior a la producción", path: ["fechaVencimiento"] })
  .refine((d) => d.fechaProduccion <= hoyEnLima(), { message: "La fecha de producción no puede ser futura", path: ["fechaProduccion"] });

/** Registra un lote con su origen y certificados; genera un código único. */
export async function crearLote(entrada: z.infer<typeof esquemaLote>): Promise<Resultado<{ codigo: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const d = esquemaLote.parse(entrada);
    const oferta = await prisma.oferta.findFirst({ where: { id: d.ofertaId, proveedorId: usuario.proveedorId }, include: { producto: true } });
    if (!oferta) throw new ErrorNegocio("Producto no encontrado en tu catálogo");
    const total = await prisma.lote.count();
    const prefijo = oferta.producto.slug.slice(0, 3).toUpperCase();
    const codigo = `L${d.fechaProduccion.slice(2, 4)}${d.fechaProduccion.slice(5, 7)}-${prefijo}-${String(total + 1).padStart(3, "0")}`;
    await prisma.lote.create({
      data: {
        codigo,
        ofertaId: oferta.id,
        fechaProduccion: new Date(`${d.fechaProduccion}T00:00:00Z`),
        fechaVencimiento: new Date(`${d.fechaVencimiento}T00:00:00Z`),
        origen: d.origen,
        descripcionOrigen: d.descripcionOrigen || null,
        certificados: { create: d.certificados.map((c) => ({ ...c, vigencia: new Date(`${c.vigencia}T00:00:00Z`) })) },
      },
    });
    revalidatePath("/proveedor/lotes");
    return { codigo };
  }, "Lote registrado");
}
