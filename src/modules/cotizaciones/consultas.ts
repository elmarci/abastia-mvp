import "server-only";
import { prisma } from "@/lib/prisma";
import { num } from "@/lib/formato";
import { ErrorAcceso } from "@/lib/sesion";

/** Solicitudes de cotización de la empresa del comprador. */
export async function solicitudesEmpresa(empresaId: string) {
  return prisma.solicitudCotizacion.findMany({
    where: { empresaId },
    include: { sede: true, _count: { select: { items: true, cotizaciones: true, invitados: true } } },
    orderBy: { creadoEn: "desc" },
  });
}

/**
 * Detalle con la tabla comparativa. Solo la empresa dueña puede verla
 * (aislamiento multiempresa verificado en el servidor).
 */
export async function detalleSolicitud(id: string, empresaId: string) {
  const s = await prisma.solicitudCotizacion.findUnique({
    where: { id },
    include: {
      sede: true,
      invitados: { select: { id: true, razonSocial: true } },
      items: { include: { producto: true }, orderBy: { id: "asc" } },
      cotizaciones: { include: { proveedor: true, precios: true }, orderBy: { total: "asc" } },
    },
  });
  if (!s) throw new ErrorAcceso(404, "Solicitud no encontrada");
  if (s.empresaId !== empresaId) throw new ErrorAcceso(403, "No tienes acceso a esta solicitud");
  const cotizaciones = s.cotizaciones.map((c) => ({
    id: c.id,
    proveedor: c.proveedor.razonSocial,
    calificacion: num(c.proveedor.calificacion),
    plazoDias: c.plazoDias,
    condiciones: c.condiciones,
    total: num(c.total),
    precios: Object.fromEntries(c.precios.map((p) => [p.itemSolicitudId, num(p.precioUnitario)])) as Record<string, number>,
  }));
  // La mejor cotización es la de menor total (ya vienen ordenadas)
  const mejorId = cotizaciones[0]?.id ?? null;
  return { ...s, cotizaciones, mejorId };
}

/** Solicitudes a las que fue invitado el proveedor, con su respuesta si ya cotizó. */
export async function solicitudesProveedor(proveedorId: string) {
  const solicitudes = await prisma.solicitudCotizacion.findMany({
    where: { invitados: { some: { id: proveedorId } } },
    include: {
      empresa: { select: { razonSocial: true } },
      sede: { select: { nombre: true, distrito: true } },
      items: { include: { producto: true, precios: { where: { cotizacion: { proveedorId } } } }, orderBy: { id: "asc" } },
      cotizaciones: { where: { proveedorId } },
    },
    orderBy: { creadoEn: "desc" },
  });
  const ofertas = await prisma.oferta.findMany({ where: { proveedorId }, select: { productoId: true, precio: true } });
  return solicitudes.map((s) => ({
    ...s,
    propia: s.cotizaciones[0] ? { plazoDias: s.cotizaciones[0].plazoDias, condiciones: s.cotizaciones[0].condiciones, total: num(s.cotizaciones[0].total) } : null,
    items: s.items.map((i) => ({
      id: i.id,
      cantidad: i.cantidad,
      producto: { nombre: i.producto.nombre, emoji: i.producto.emoji, unidadPlural: i.producto.unidadPlural },
      // Precio sugerido: el ya cotizado o el de su catálogo
      precioSugerido: i.precios[0] ? num(i.precios[0].precioUnitario) : num(ofertas.find((o) => o.productoId === i.productoId)?.precio ?? 0),
    })),
  }));
}

/** Productos y proveedores para armar una solicitud. */
export async function datosNuevaSolicitud() {
  const [productos, proveedores] = await Promise.all([
    prisma.producto.findMany({ select: { id: true, nombre: true, emoji: true, unidadPlural: true, categoria: { select: { nombre: true } } }, orderBy: [{ categoria: { orden: "asc" } }, { nombre: "asc" }] }),
    prisma.proveedor.findMany({ where: { estado: "HOMOLOGADO" }, select: { id: true, razonSocial: true }, orderBy: { razonSocial: "asc" } }),
  ]);
  return { productos: productos.map((p) => ({ ...p, categoria: p.categoria.nombre })), proveedores };
}
