import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { ErrorAcceso, type UsuarioSesion } from "@/lib/sesion";

export async function licitacionesEmpresa(empresaId: string) {
  return prisma.licitacion.findMany({ where: { empresaId }, include: { _count: { select: { propuestas: true } }, contrato: { select: { id: true, codigo: true } } }, orderBy: { creadoEn: "desc" } });
}

/**
 * Detalle para la entidad compradora. Mientras la licitación esté abierta
 * las propuestas permanecen SELLADAS: solo se informa cuántas hay.
 */
export async function detalleLicitacion(id: string, empresaId: string) {
  const lic = await prisma.licitacion.findUnique({
    where: { id },
    include: {
      criterios: { orderBy: { peso: "desc" } },
      contrato: { select: { id: true, codigo: true } },
      propuestas: { include: { proveedor: { select: { id: true, razonSocial: true, calificacion: true } } }, orderBy: [{ puntaje: "desc" }, { montoTotal: "asc" }] },
    },
  });
  if (!lic) throw new ErrorAcceso(404, "Licitación no encontrada");
  if (lic.empresaId !== empresaId) throw new ErrorAcceso(403, "No tienes acceso a esta licitación");
  const selladas = lic.estado === "ABIERTA";
  return {
    ...lic,
    presupuestoReferencial: lic.presupuestoReferencial ? num(lic.presupuestoReferencial) : null,
    numeroPropuestas: lic.propuestas.length,
    propuestas: selladas ? [] : lic.propuestas.map((p) => ({ ...p, montoTotal: num(p.montoTotal), puntaje: p.puntaje ? num(p.puntaje) : 0, calificacion: num(p.proveedor.calificacion) })),
  };
}

/**
 * Propuestas de una licitación para la API. Solo la entidad dueña y solo
 * después del cierre (403 antes). Un proveedor ve únicamente la suya.
 */
export async function propuestasLicitacion(id: string, usuario: UsuarioSesion) {
  const lic = await prisma.licitacion.findUnique({ where: { id }, include: { propuestas: { include: { proveedor: { select: { razonSocial: true } } } } } });
  if (!lic) throw new ErrorAcceso(404, "Licitación no encontrada");
  if (usuario.rol === "PROVEEDOR") {
    return lic.propuestas.filter((p) => p.proveedorId === usuario.proveedorId);
  }
  if (!usuario.empresaId || lic.empresaId !== usuario.empresaId) throw new ErrorAcceso(403, "No tienes acceso a esta licitación");
  if (lic.estado === "ABIERTA") throw new ErrorAcceso(403, "Las propuestas están selladas hasta el cierre de la licitación");
  return lic.propuestas;
}

/** Licitaciones visibles para un proveedor: abiertas y en las que participó. */
export async function licitacionesProveedor(proveedorId: string) {
  const lista = await prisma.licitacion.findMany({
    where: { OR: [{ estado: "ABIERTA" }, { propuestas: { some: { proveedorId } } }] },
    include: { empresa: { select: { razonSocial: true, tipo: true } }, criterios: { orderBy: { peso: "desc" } }, propuestas: { where: { proveedorId } } },
    orderBy: [{ estado: "asc" }, { fechaCierre: "asc" }],
  });
  return lista.map((l) => ({
    ...l,
    presupuestoReferencial: l.presupuestoReferencial ? num(l.presupuestoReferencial) : null,
    propia: l.propuestas[0] ? { ...l.propuestas[0], montoTotal: num(l.propuestas[0].montoTotal), puntaje: l.propuestas[0].puntaje ? num(l.propuestas[0].puntaje) : null } : null,
    gane: l.adjudicadaAId === proveedorId,
  }));
}
