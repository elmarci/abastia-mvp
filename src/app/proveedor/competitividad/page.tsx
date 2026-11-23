import type { Metadata } from "next";
import { Target, Trophy } from "lucide-react";
import { Encabezado, Kpi } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { requerirPagina } from "@/lib/sesion";
import { porcentaje, soles } from "@/lib/formato";
import { competitividadProveedor } from "@/modules/proveedor/consultas";

export const metadata: Metadata = { title: "Competitividad" };

export default async function Competitividad() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const ofertas = (await competitividadProveedor(usuario.proveedorId!)).filter((o) => o.activa).sort((a, b) => b.porEncima - a.porEncima);
  const mejores = ofertas.filter((o) => o.esMejor).length;
  const competitivas = ofertas.filter((o) => o.competitivo).length;
  return (
    <>
      <Encabezado titulo="Competitividad de precios" descripcion="Tu precio frente a la mejor oferta homologada del mercado. Hasta 2 % por encima se considera competitivo." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Kpi titulo="Ofertas activas" valor={ofertas.length} icono={<Target />} />
        <Kpi titulo="Eres la mejor oferta en" valor={`${mejores} productos`} icono={<Trophy />} tono="ahorro" />
        <Kpi titulo="Competitivas" valor={ofertas.length ? porcentaje(competitivas / ofertas.length, 0) : "—"} detalle={`${competitivas} de ${ofertas.length}`} />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {ofertas.map((o) => (
          <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid="competitividad">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">
                {o.emoji} {o.producto}
              </p>
              {o.esMejor ? <Badge>Mejor oferta</Badge> : o.competitivo ? <Badge variant="exito">Competitivo</Badge> : <Badge variant="alerta">{porcentaje(o.porEncima)} por encima</Badge>}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Tu precio</p>
                <p className="font-semibold cifra">{soles(o.precio)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mejor del mercado</p>
                <p className="cifra">{soles(o.mejorPrecio)}</p>
                <p className="truncate text-[11px] text-muted-foreground">{o.mejorProveedor}</p>
              </div>
            </div>
            <Progress className="mt-3" value={Math.max(5, 100 - o.porEncima * 400)} indicadorClassName={o.competitivo ? "bg-primary" : "bg-accent"} aria-label="Nivel de competitividad" />
            {!o.competitivo && <p className="mt-2 text-xs text-muted-foreground">Para ser la mejor oferta, baja a {soles(o.mejorPrecio - 0.1)} o menos.</p>}
          </div>
        ))}
      </div>
    </>
  );
}
