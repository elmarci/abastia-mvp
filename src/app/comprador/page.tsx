import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Download, PiggyBank, ShoppingBag, TrendingDown, Truck } from "lucide-react";
import { Encabezado, Kpi } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GraficoBarrasH, GraficoColumnas } from "@/components/graficos";
import { requerirPagina } from "@/lib/sesion";
import { sedesYActual } from "@/lib/sede";
import { numero, porcentaje, soles } from "@/lib/formato";
import { ETIQUETAS_NIVEL } from "@/lib/negocio";
import { panelGasto } from "@/modules/panel/consultas";

export const metadata: Metadata = { title: "Panel de gasto" };

export default async function PanelComprador() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR", "MAYORISTA"]);
  if (usuario.rol === "MAYORISTA") redirect("/comprador/catalogo");
  const { actual } = await sedesYActual(usuario.empresaId!);
  const d = await panelGasto(usuario.empresaId!, actual?.id ?? null);
  const nombreMes = (m: string) => new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit", timeZone: "UTC" }).format(new Date(`${m}-15T12:00:00Z`));
  const primero = d.mensual[0]?.valor ?? 0;
  const ultimo = d.mensual[d.mensual.length - 1]?.valor ?? 0;

  return (
    <>
      <Encabezado
        titulo={`Hola, ${usuario.nombre.split(" ")[0]}`}
        descripcion="Así va el gasto de tu organización y lo que ahorras comprando en AbastIA."
        acciones={
          <>
            <Button variant="outline" asChild>
              <a href="/api/reportes/gasto" download data-testid="exportar-csv">
                <Download /> Exportar CSV
              </a>
            </Button>
            <Button asChild>
              <Link href="/comprador/planificador">Planificar compra</Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Gasto del mes" valor={soles(d.gastoMes)} detalle="Pedidos aprobados, con IGV" icono={<ShoppingBag />} />
        <Kpi titulo="Ahorro acumulado" valor={<span data-testid="ahorro-acumulado">{soles(d.ahorroTotal)}</span>} detalle={`${porcentaje(d.porcentajeAhorro)} frente al precio promedio de mercado`} icono={<PiggyBank />} tono="ahorro" />
        <Kpi titulo="Pedidos del mes" valor={d.pedidosMes} icono={<CalendarCheck />} />
        <Kpi titulo="Proveedores usados" valor={d.proveedoresMes} detalle="Este mes, en un solo pedido consolidado" icono={<Truck />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Gasto mensual</CardTitle>
            <CardDescription>
              Últimos 6 meses cerrados.{" "}
              {primero > 0 && ultimo < primero && (
                <span className="text-amber-700 dark:text-amber-300">
                  Bajó {porcentaje((primero - ultimo) / primero)} desde {nombreMes(d.mensual[0].mes)}.
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent data-testid="grafico-mensual">
            <GraficoColumnas datos={d.mensual.map((m) => ({ etiqueta: nombreMes(m.mes), valor: m.valor }))} destacarUltimo />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gasto por categoría</CardTitle>
            <CardDescription>Últimos 6 meses y mes en curso.</CardDescription>
          </CardHeader>
          <CardContent>
            <GraficoBarrasH datos={d.porCategoria} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Gasto por sede</CardTitle>
          </CardHeader>
          <CardContent>
            <GraficoBarrasH datos={d.porSede} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertas de stock</CardTitle>
            <CardDescription>{actual?.nombre}: stock bajo si es menor al 30 % del consumo semanal.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.alertasStock.length === 0 && <p className="text-sm text-muted-foreground">Todo en orden.</p>}
            {d.alertasStock.slice(0, 7).map((a) => (
              <div key={a.productoId} className="flex items-center justify-between gap-2 text-sm" data-testid={`alerta-stock-${a.nombre}`}>
                <span className="min-w-0 truncate">
                  {a.emoji} {a.nombre}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-xs text-muted-foreground cifra">
                    {a.stock} / ~{numero(a.consumoSemanal)}
                  </span>
                  <Badge variant={a.nivel === "SIN_STOCK" ? "peligro" : "alerta"}>{ETIQUETAS_NIVEL[a.nivel]}</Badge>
                </span>
              </div>
            ))}
            <Button variant="link" className="px-0" asChild>
              <Link href="/comprador/planificador">Reponer con el planificador →</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Alertas de precio</CardTitle>
            <CardDescription>Mejor precio que bajó 5 % o más frente a la semana anterior.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {d.alertasPrecio.length === 0 && <p className="text-sm text-muted-foreground">Sin bajadas de precio esta semana.</p>}
            {d.alertasPrecio.slice(0, 6).map((a) => (
              <Link key={a.productoId} href={`/comprador/catalogo/${a.productoId}`} className="flex items-center justify-between gap-2 rounded-xl p-1 text-sm hover:bg-muted">
                <span className="min-w-0">
                  <span className="block truncate">
                    {a.emoji} {a.nombre}
                  </span>
                  <span className="block text-xs text-muted-foreground cifra">
                    {soles(a.anterior)} → {soles(a.actual)}
                  </span>
                </span>
                <Badge variant="ahorro">
                  <TrendingDown className="size-3" /> {porcentaje(a.caida)}
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
