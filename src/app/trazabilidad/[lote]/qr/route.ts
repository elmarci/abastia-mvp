import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { qrPng, urlTrazabilidad } from "@/modules/trazabilidad/qr";

/** Descarga el QR del lote en PNG. Es público, como la página de trazabilidad. */
export async function GET(_req: Request, { params }: { params: Promise<{ lote: string }> }) {
  const { lote } = await params;
  const codigo = decodeURIComponent(lote);
  const existe = await prisma.lote.findUnique({ where: { codigo }, select: { id: true } });
  if (!existe) return NextResponse.json({ error: "Lote no encontrado" }, { status: 404 });
  const png = await qrPng(await urlTrazabilidad(codigo));
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="qr-${codigo}.png"`, "Cache-Control": "public, max-age=3600" },
  });
}
