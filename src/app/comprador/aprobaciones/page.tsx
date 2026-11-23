import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Card, CardContent } from "@/components/ui/card";
import { requerirPagina } from "@/lib/sesion";
import { fecha, num, soles } from "@/lib/formato";
import { listarPedidos } from "@/modules/pedidos/consultas";
import { prisma } from "@/lib/prisma";
import { BotonesAprobacion } from "@/modules/pedidos/componentes/acciones-pedido";

export const metadata: Metadata = { title: "Aprobaciones" };

export default async function PaginaAprobaciones() {
  const usuario = await requerirPagina(["APROBADOR"]);
  const pedidos = await listarPedidos(usuario, { pendientes: true });
  const sedes = await prisma.sede.findMany({ where: { empresaId: usuario.empresaId! } });
  return (
    <>
      <Encabezado titulo="Aprobaciones" descripcion="Pedidos que superan el monto límite de su sede. Los proveedores los verán recién cuando los apruebes." />
      {pedidos.length === 0 ? (
        <EstadoVacio icono={<BadgeCheck className="size-7" />} titulo="No hay pedidos por aprobar" descripcion="Te avisaremos con una notificación cuando llegue uno." />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => {
            const sede = sedes.find((s) => s.nombre === p.sede?.nombre);
            return (
              <Card key={p.id} data-testid="pedido-por-aprobar">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <Link href={`/comprador/pedidos/${p.id}`} className="text-lg font-semibold hover:text-primary">
                      {p.codigo}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {fecha(p.creadoEn)} · {p.sede?.nombre} · {p.creadoPor.nombre} · {p.subPedidos.length} proveedores
                    </p>
                    <p className="mt-1 text-sm">
                      Total <span className="font-semibold cifra">{soles(p.total)}</span>
                      {sede && <span className="text-muted-foreground"> · límite de la sede {soles(num(sede.montoLimiteAprobacion))}</span>}
                    </p>
                  </div>
                  <BotonesAprobacion pedidoId={p.id} />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
