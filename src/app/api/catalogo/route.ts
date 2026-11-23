import { NextRequest } from "next/server";
import { z } from "zod";
import { responder } from "@/lib/api";
import { requerirRol } from "@/lib/sesion";
import { listarCatalogo } from "@/modules/catalogo/consultas";

const filtros = z.object({
  q: z.string().max(80).optional(),
  categoria: z.string().max(40).optional(),
  orden: z.enum(["relevancia", "precio-asc", "precio-desc", "ahorro"]).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
});

/** GET /api/catalogo: productos con mejor oferta, promedio y % de ahorro. */
export async function GET(req: NextRequest) {
  return responder(async () => {
    await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "ADMIN"]);
    const params = filtros.parse(Object.fromEntries(req.nextUrl.searchParams));
    const productos = await listarCatalogo(params);
    return {
      productos: productos.map((p) => ({
        id: p.id,
        nombre: p.nombre,
        emoji: p.emoji,
        unidad: p.unidad,
        categoria: p.categoria,
        numeroProveedores: p.numeroProveedores,
        mejorOferta: p.mejor ? { id: p.mejor.id, proveedor: p.mejor.proveedor, precio: p.mejor.precio } : null,
        precioPromedio: p.promedio,
        porcentajeAhorro: Math.round(p.ahorro * 1000) / 10,
      })),
    };
  });
}
