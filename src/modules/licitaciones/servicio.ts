import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { puntajeLicitacion } from "@/lib/negocio";
import { notificar } from "@/modules/pedidos/servicio";

type Tx = Prisma.TransactionClient;

/**
 * Cierra una licitación: calcula el puntaje de cada propuesta con
 * `puntajeLicitacion` y la deja lista para adjudicar (o desierta si no hubo propuestas).
 */
export async function cerrarYEvaluar(tx: Tx, licitacionId: string) {
  const lic = await tx.licitacion.findUniqueOrThrow({
    where: { id: licitacionId },
    include: { criterios: true, propuestas: { include: { proveedor: { select: { calificacion: true, usuarios: { select: { id: true } } } } } }, empresa: { include: { usuarios: { select: { id: true } } } } },
  });
  if (lic.estado !== "ABIERTA") return lic.estado;
  const resultado = puntajeLicitacion(
    lic.propuestas.map((p) => ({ id: p.id, montoTotal: num(p.montoTotal), plazoEntregaDias: p.plazoEntregaDias, certificados: p.certificados, calificacion: num(p.proveedor.calificacion) })),
    lic.criterios.map((c) => ({ tipo: c.tipo, peso: c.peso })),
    lic.certificadosObligatorios,
  );
  for (const r of resultado) {
    await tx.propuestaLicitacion.update({ where: { id: r.id }, data: { puntaje: r.puntaje } });
  }
  const estado = lic.propuestas.length === 0 ? "DESIERTA" : "CERRADA";
  await tx.licitacion.update({ where: { id: lic.id }, data: { estado, fechaCierre: lic.fechaCierre > new Date() ? new Date() : lic.fechaCierre } });
  await notificar(tx, lic.empresa.usuarios.map((u) => u.id), `Licitación ${lic.codigo} cerrada`, estado === "DESIERTA" ? "No se recibieron propuestas." : `Se evaluaron ${lic.propuestas.length} propuestas. Revisa el ranking y adjudica.`, `/comprador/licitaciones/${lic.id}`);
  const proveedores = lic.propuestas.flatMap((p) => p.proveedor.usuarios.map((u) => u.id));
  await notificar(tx, proveedores, `Licitación ${lic.codigo} cerrada`, "La entidad está evaluando las propuestas.", "/proveedor/licitaciones");
  return estado;
}

/** Cierra las licitaciones abiertas cuya fecha de cierre ya pasó (cron diario). */
export async function cerrarLicitacionesVencidas(ahora: Date = new Date()) {
  const vencidas = await prisma.licitacion.findMany({ where: { estado: "ABIERTA", fechaCierre: { lte: ahora } }, select: { id: true } });
  for (const l of vencidas) {
    await prisma.$transaction((tx) => cerrarYEvaluar(tx, l.id));
  }
  return vencidas.length;
}
