import { NextResponse } from "next/server";
import { ErrorAcceso, requerirRol } from "@/lib/sesion";
import { detallePedido } from "@/modules/pedidos/consultas";
import { facturacion } from "@/lib/servicios/facturacion";

/** GET /api/pedidos/:id/comprobante: comprobante consolidado en PDF (de prueba). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "MAYORISTA", "CONSUMIDOR", "ADMIN"]);
    const { id } = await params;
    const pedido = await detallePedido(id, usuario);
    const { pdf } = await facturacion.emitir(pedido);
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="comprobante-${pedido.codigo}.pdf"`,
      },
    });
  } catch (error) {
    if (error instanceof ErrorAcceso) return NextResponse.json({ error: error.message }, { status: error.estado });
    console.error(error);
    return NextResponse.json({ error: "No se pudo generar el comprobante" }, { status: 500 });
  }
}
