import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";

const incluir = {
  empresa: { select: { razonSocial: true } },
  proveedor: { select: { razonSocial: true } },
  sede: { select: { nombre: true, distrito: true } },
  licitacion: { select: { codigo: true } },
  entregas: { include: { lote: { select: { codigo: true } } }, orderBy: { fecha: "asc" as const } },
};

function aVista<T extends { montoTotal: unknown; entregas: { temperatura: unknown }[] }>(c: T) {
  return {
    ...c,
    montoTotal: num(c.montoTotal as never),
    entregas: c.entregas.map((e) => ({ ...e, temperatura: e.temperatura === null ? null : num(e.temperatura as never) })),
  };
}

export async function contratosEmpresa(empresaId: string) {
  const lista = await prisma.contrato.findMany({ where: { empresaId }, include: incluir, orderBy: { creadoEn: "desc" } });
  return lista.map(aVista);
}

export async function contratosProveedor(proveedorId: string) {
  const lista = await prisma.contrato.findMany({ where: { proveedorId }, include: incluir, orderBy: { creadoEn: "desc" } });
  return lista.map(aVista);
}

/** Lotes del proveedor para asociarlos a una entrega. */
export async function lotesDelProveedor(proveedorId: string) {
  return prisma.lote.findMany({ where: { oferta: { proveedorId } }, select: { id: true, codigo: true, oferta: { select: { producto: { select: { nombre: true } } } } }, orderBy: { creadoEn: "desc" } });
}

export type ContratoVista = Awaited<ReturnType<typeof contratosEmpresa>>[number];
