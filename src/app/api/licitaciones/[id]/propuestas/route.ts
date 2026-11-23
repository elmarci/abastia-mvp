import { responder } from "@/lib/api";
import { requerirRol } from "@/lib/sesion";
import { propuestasLicitacion } from "@/modules/licitaciones/consultas";

/** GET /api/licitaciones/:id/propuestas — 403 mientras la licitación siga abierta. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return responder(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "PROVEEDOR"]);
    const { id } = await params;
    const propuestas = await propuestasLicitacion(id, usuario);
    return { propuestas: propuestas.map((p) => ({ id: p.id, proveedor: p.proveedor.razonSocial, montoTotal: Number(p.montoTotal), plazoEntregaDias: p.plazoEntregaDias, certificados: p.certificados, puntaje: p.puntaje ? Number(p.puntaje) : null })) };
  });
}
