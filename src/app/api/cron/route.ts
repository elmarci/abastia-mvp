import { NextResponse } from "next/server";
import { hoyEnLima } from "@/lib/negocio";
import { ejecutarRecurrentesDelDia } from "@/modules/recurrentes/servicio";
import { cerrarLicitacionesVencidas } from "@/modules/licitaciones/servicio";

export const dynamic = "force-dynamic";

/**
 * Cron diario de Vercel (vercel.json): genera los pedidos recurrentes del día
 * y cierra las licitaciones vencidas. Si existe CRON_SECRET, se exige el
 * encabezado `Authorization: Bearer <CRON_SECRET>` (Vercel lo envía solo).
 */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (secreto && req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const hoy = hoyEnLima();
  const pedidos = await ejecutarRecurrentesDelDia(hoy);
  const licitaciones = await cerrarLicitacionesVencidas();
  return NextResponse.json({ fecha: hoy, pedidosGenerados: pedidos, licitacionesCerradas: licitaciones });
}
