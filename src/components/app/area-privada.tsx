import "server-only";
import { Suspense } from "react";
import { Shell } from "@/components/app/shell";
import { prisma } from "@/lib/prisma";
import { sedesYActual } from "@/lib/sede";
import type { UsuarioSesion } from "@/lib/sesion";
import { AvisoDenegado } from "@/components/app/aviso-denegado";

/** Carga los datos de la barra superior y envuelve la página en el layout de la app. */
export async function AreaPrivada({ usuario, children }: { usuario: UsuarioSesion; children: React.ReactNode }) {
  const [notificaciones, noLeidas, carrito, empresa, proveedor] = await Promise.all([
    prisma.notificacion.findMany({ where: { usuarioId: usuario.id }, orderBy: { creadoEn: "desc" }, take: 12 }),
    prisma.notificacion.count({ where: { usuarioId: usuario.id, leida: false } }),
    prisma.carrito.findUnique({ where: { usuarioId: usuario.id }, include: { _count: { select: { items: true } } } }),
    usuario.empresaId ? prisma.empresa.findUnique({ where: { id: usuario.empresaId }, select: { razonSocial: true } }) : null,
    usuario.proveedorId ? prisma.proveedor.findUnique({ where: { id: usuario.proveedorId }, select: { razonSocial: true } }) : null,
  ]);
  const sedes = usuario.empresaId && usuario.rol !== "MAYORISTA" ? await sedesYActual(usuario.empresaId) : null;

  return (
    <Shell
      rol={usuario.rol}
      datos={{
        nombre: usuario.nombre,
        email: usuario.email,
        organizacion: empresa?.razonSocial ?? proveedor?.razonSocial ?? null,
        sedes: sedes?.sedes.map((s) => ({ id: s.id, nombre: s.nombre })) ?? [],
        sedeActualId: sedes?.actual?.id ?? null,
        notificaciones: notificaciones.map((n) => ({ ...n, creadoEn: n.creadoEn.toISOString() })),
        noLeidas,
        itemsCarrito: carrito?._count.items ?? 0,
      }}
    >
      <Suspense fallback={null}>
        <AvisoDenegado />
      </Suspense>
      {children}
    </Shell>
  );
}
