"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requerirProveedor } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { notificar } from "@/modules/pedidos/servicio";

const esquemaEntrega = z.object({
  entregaId: z.string().min(1),
  loteId: z.string().optional(),
  temperatura: z.coerce.number().min(-30).max(40).optional(),
  observacion: z.string().trim().max(300).optional(),
});

/** El proveedor registra una entrega programada del contrato (con lote y temperatura opcional). */
export async function registrarEntrega(entrada: z.infer<typeof esquemaEntrega>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const d = esquemaEntrega.parse(entrada);
    const entrega = await prisma.entregaProgramada.findFirst({
      where: { id: d.entregaId, contrato: { proveedorId: usuario.proveedorId } },
      include: { contrato: { include: { empresa: { include: { usuarios: { select: { id: true } } } } } } },
    });
    if (!entrega) throw new ErrorNegocio("Entrega no encontrada");
    if (entrega.estado !== "PROGRAMADA") throw new ErrorNegocio("Esta entrega ya fue registrada");
    if (d.loteId) {
      const lote = await prisma.lote.findFirst({ where: { id: d.loteId, oferta: { proveedorId: usuario.proveedorId } } });
      if (!lote) throw new ErrorNegocio("Lote no encontrado");
    }
    await prisma.entregaProgramada.update({
      where: { id: entrega.id },
      data: { estado: d.observacion ? "OBSERVADA" : "ENTREGADA", loteId: d.loteId || null, temperatura: d.temperatura ?? null, observacion: d.observacion || null },
    });
    await notificar(prisma, entrega.contrato.empresa.usuarios.map((u) => u.id), `Entrega del contrato ${entrega.contrato.codigo}`, d.observacion ? `Entrega con observación: ${d.observacion}` : "Se registró una entrega programada.", "/comprador/contratos");
    revalidatePath("/proveedor/contratos");
    revalidatePath("/comprador/contratos");
  }, "Entrega registrada");
}
