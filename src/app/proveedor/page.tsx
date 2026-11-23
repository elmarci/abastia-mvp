import type { Metadata } from "next";
import Link from "next/link";
import { BadgeDollarSign, Clock, PackageCheck, Star, Wallet } from "lucide-react";
import { Encabezado, Kpi } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GraficoColumnas } from "@/components/graficos";
import { requerirPagina } from "@/lib/sesion";
import { fecha, num, porcentaje, soles } from "@/lib/formato";
import { panelProveedor } from "@/modules/proveedor/consultas";
import { EstadoBadge } from "@/modules/pedidos/componentes/estado";

export const metadata: Metadata = { title: "Panel del proveedor" };

export default async function PanelProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const p = await panelProveedor(usuario.proveedorId!);
  const nombresMes = (m: string) => new Intl.DateTimeFormat("es-PE", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));

  return (
    <>
      <Encabezado
        titulo={p.proveedor.razonSocial}
        descripcion={
          <span className="inline-flex flex-wrap items-center gap-2">
            <Badge variant={p.proveedor.estado === "HOMOLOGADO" ? "exito" : "alerta"}>{p.proveedor.estado === "HOMOLOGADO" ? "Homologado" : p.proveedor.estado === "PENDIENTE" ? "Pendiente de homologación" : "Suspendido"}</Badge>
            Comisión AbastIA {porcentaje(num(p.proveedor.comision), 0)} sobre el valor de venta
          </span>
        }
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Ventas del mes" valor={soles(p.ventasMes)} detalle="Total con IGV" icono={<BadgeDollarSign />} />
        <Kpi titulo="Neto a recibir del mes" valor={soles(p.netoMes)} detalle="Después de IGV y comisión" icono={<Wallet />} tono="ahorro" />
        <Kpi titulo="Pedidos pendientes" valor={p.pendientes} detalle={<Link href="/proveedor/pedidos" className="text-primary hover:underline">Atender pedidos</Link>} icono={<Clock />} />
        <Kpi titulo="Calificación" valor={`${num(p.proveedor.calificacion).toFixed(1)} / 5`} detalle={`${p.proveedor.numeroCalificaciones} calificaciones · ${p.entregados} entregados`} icono={<Star />} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Ventas por mes</CardTitle>
            <CardDescription>Total con IGV, últimos meses con ventas.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoColumnas datos={p.meses.map((m) => ({ etiqueta: nombresMes(m.mes), valor: m.total }))} destacarUltimo />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Liquidación neta por pedido</CardTitle>
            <CardDescription>Neto = (total ÷ 1.18) × (1 − comisión). La comisión se cobra sobre el valor de venta.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pedido</TableHead>
                  <TableHead className="hidden md:table-cell">Cliente</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">IGV</TableHead>
                  <TableHead className="hidden text-right sm:table-cell">Comisión</TableHead>
                  <TableHead className="text-right">Neto</TableHead>
                  <TableHead className="hidden lg:table-cell">Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.liquidaciones.slice(0, 15).map((l) => (
                  <TableRow key={l.id} data-testid="fila-liquidacion">
                    <TableCell>
                      <Link href={`/proveedor/pedidos/${l.pedidoId}`} className="font-medium hover:text-primary">
                        {l.codigo}
                      </Link>
                      <p className="text-xs text-muted-foreground">{fecha(l.fecha)}</p>
                    </TableCell>
                    <TableCell className="hidden max-w-44 truncate md:table-cell">{l.cliente}</TableCell>
                    <TableCell className="text-right cifra" data-testid="liq-total">{soles(l.total)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground cifra sm:table-cell">{soles(l.igv)}</TableCell>
                    <TableCell className="hidden text-right text-muted-foreground cifra sm:table-cell">
                      {soles(l.comision)} <span className="text-[11px]">({porcentaje(l.comisionPct, 0)})</span>
                    </TableCell>
                    <TableCell className="text-right font-semibold cifra" data-testid="liq-neto">{soles(l.neto)}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <EstadoBadge estado={l.estado} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <PackageCheck className="size-4" /> Pagos a proveedores simulados en el MVP: la liquidación muestra lo que se transferiría.
      </p>
    </>
  );
}
