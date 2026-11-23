"use server";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { requerirEmpresa, requerirProveedor } from "@/lib/sesion";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { calendarioEntregas, primeraFechaEntrega, sumarDias } from "@/lib/negocio";
import { notificar } from "@/modules/pedidos/servicio";
import { esquemaLicitacion, esquemaPropuesta } from "@/modules/licitaciones/esquemas";
import { cerrarYEvaluar } from "@/modules/licitaciones/servicio";

function revalidar() {
  revalidatePath("/comprador/licitaciones", "layout");
  revalidatePath("/comprador/contratos");
  revalidatePath("/proveedor/licitaciones");
  revalidatePath("/proveedor/contratos");
}

/** La institución publica una licitación con criterios ponderados. */
export async function crearLicitacion(entrada: z.infer<typeof esquemaLicitacion>): Promise<Resultado<{ id: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const d = esquemaLicitacion.parse(entrada);
    const total = await prisma.licitacion.count();
    const lic = await prisma.licitacion.create({
      data: {
        codigo: `LIC-${String(total + 1).padStart(4, "0")}`,
        empresaId: usuario.empresaId,
        titulo: d.titulo,
        descripcion: d.descripcion,
        certificadosObligatorios: d.certificadosObligatorios,
        plazoContratoMeses: d.plazoContratoMeses,
        frecuencia: d.frecuencia,
        volumenEstimado: d.volumenEstimado,
        presupuestoReferencial: d.presupuestoReferencial,
        fechaCierre: new Date(d.fechaCierre),
        criterios: { create: d.criterios },
      },
    });
    // Avisamos a todos los proveedores homologados
    const usuarios = await prisma.usuario.findMany({ where: { rol: "PROVEEDOR", proveedor: { estado: "HOMOLOGADO" } }, select: { id: true } });
    await notificar(prisma, usuarios.map((u) => u.id), "Nueva licitación publicada", `${lic.codigo}: ${lic.titulo}`, "/proveedor/licitaciones");
    revalidar();
    return { id: lic.id };
  }, "Licitación publicada");
}

/** Cierra la licitación antes de la fecha (o al vencer) y calcula el ranking. */
export async function cerrarLicitacion(id: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const lic = await prisma.licitacion.findFirst({ where: { id, empresaId: usuario.empresaId } });
    if (!lic) throw new ErrorNegocio("Licitación no encontrada");
    if (lic.estado !== "ABIERTA") throw new ErrorNegocio("La licitación ya está cerrada");
    await prisma.$transaction((tx) => cerrarYEvaluar(tx, id));
    revalidar();
  }, "Licitación cerrada y propuestas evaluadas");
}

/** Adjudica la propuesta elegida y crea el contrato de abastecimiento programado. */
export async function adjudicarLicitacion(propuestaId: string): Promise<Resultado<{ contratoId: string }>> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const propuesta = await prisma.propuestaLicitacion.findFirst({
      where: { id: propuestaId, licitacion: { empresaId: usuario.empresaId } },
      include: { licitacion: true, proveedor: { include: { usuarios: { select: { id: true } } } } },
    });
    if (!propuesta) throw new ErrorNegocio("Propuesta no encontrada");
    const lic = propuesta.licitacion;
    if (lic.estado !== "CERRADA") throw new ErrorNegocio("Solo se adjudican licitaciones cerradas y evaluadas");
    const sede = await prisma.sede.findFirst({ where: { empresaId: usuario.empresaId }, orderBy: { creadoEn: "asc" } });
    const inicio = primeraFechaEntrega();
    const fin = sumarDias(inicio, lic.plazoContratoMeses * 30);
    const fechas = calendarioEntregas(inicio, lic.plazoContratoMeses, lic.frecuencia);
    const contrato = await prisma.$transaction(async (tx) => {
      await tx.licitacion.update({ where: { id: lic.id }, data: { estado: "ADJUDICADA", adjudicadaAId: propuesta.proveedorId } });
      const total = await tx.contrato.count();
      const c = await tx.contrato.create({
        data: {
          codigo: `CTR-${String(total + 1).padStart(4, "0")}`,
          licitacionId: lic.id,
          empresaId: usuario.empresaId,
          sedeId: sede?.id ?? null,
          proveedorId: propuesta.proveedorId,
          descripcion: `${lic.titulo}. ${propuesta.descripcion}`,
          montoTotal: num(propuesta.montoTotal),
          frecuencia: lic.frecuencia,
          inicio: new Date(`${inicio}T00:00:00Z`),
          fin: new Date(`${fin}T00:00:00Z`),
          entregas: { create: fechas.map((f) => ({ fecha: new Date(`${f}T00:00:00Z`) })) },
        },
      });
      await notificar(tx, propuesta.proveedor.usuarios.map((u) => u.id), "¡Ganaste una licitación!", `${lic.codigo} te fue adjudicada. Contrato ${c.codigo} con ${fechas.length} entregas.`, "/proveedor/contratos");
      return c;
    });
    revalidar();
    return { contratoId: contrato.id };
  }, "Licitación adjudicada: contrato creado con su calendario");
}

/** El proveedor envía (o reemplaza) su propuesta sellada antes del cierre. */
export async function enviarPropuesta(entrada: z.infer<typeof esquemaPropuesta>): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirProveedor();
    const d = esquemaPropuesta.parse(entrada);
    const lic = await prisma.licitacion.findUnique({ where: { id: d.licitacionId } });
    if (!lic) throw new ErrorNegocio("Licitación no encontrada");
    if (lic.estado !== "ABIERTA" || lic.fechaCierre <= new Date()) throw new ErrorNegocio("La licitación ya cerró");
    await prisma.propuestaLicitacion.upsert({
      where: { licitacionId_proveedorId: { licitacionId: lic.id, proveedorId: usuario.proveedorId } },
      create: { licitacionId: lic.id, proveedorId: usuario.proveedorId, montoTotal: d.montoTotal, plazoEntregaDias: d.plazoEntregaDias, certificados: d.certificados, descripcion: d.descripcion },
      update: { montoTotal: d.montoTotal, plazoEntregaDias: d.plazoEntregaDias, certificados: d.certificados, descripcion: d.descripcion, creadoEn: new Date() },
    });
    revalidar();
  }, "Propuesta enviada. Quedará sellada hasta el cierre.");
}
