import { NextResponse } from "next/server";
import { ErrorAcceso, requerirEmpresa } from "@/lib/sesion";
import { num } from "@/lib/formato";
import { codigoPedido } from "@/lib/negocio";
import { itemsDeCompra } from "@/modules/panel/consultas";

const celda = (v: string | number) => {
  const t = String(v);
  return /[",;\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

/** GET /api/reportes/gasto: reporte de gasto de la empresa en CSV (UTF-8 con BOM para Excel). */
export async function GET() {
  try {
    const usuario = await requerirEmpresa(["COMPRADOR", "APROBADOR"]);
    const items = await itemsDeCompra(usuario.empresaId);
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" });
    const filas = [["fecha", "pedido", "sede", "categoria", "producto", "cantidad", "precio_unitario", "precio_promedio", "importe", "ahorro"]];
    for (const it of items.sort((a, b) => a.subPedido.pedido.creadoEn.getTime() - b.subPedido.pedido.creadoEn.getTime())) {
      const pu = num(it.precioUnitario);
      const pp = num(it.precioPromedio);
      filas.push([
        fmt.format(it.subPedido.pedido.creadoEn),
        codigoPedido(it.subPedido.pedido.numero),
        it.subPedido.pedido.sede?.nombre ?? "",
        it.producto.categoria.nombre,
        it.producto.nombre,
        String(it.cantidad),
        pu.toFixed(2),
        pp.toFixed(2),
        (pu * it.cantidad).toFixed(2),
        (Math.max(0, pp - pu) * it.cantidad).toFixed(2),
      ]);
    }
    const csv = "﻿" + filas.map((f) => f.map(celda).join(",")).join("\r\n") + "\r\n";
    return new NextResponse(csv, {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="reporte-gasto-abastia.csv"` },
    });
  } catch (e) {
    if (e instanceof ErrorAcceso) return NextResponse.json({ error: e.message }, { status: e.estado });
    throw e;
  }
}
