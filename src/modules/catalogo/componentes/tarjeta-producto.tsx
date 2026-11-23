import Link from "next/link";
import { Star, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { porcentaje, soles } from "@/lib/formato";
import type { ProductoCatalogo } from "@/modules/catalogo/consultas";
import { AgregarAlPedido } from "@/modules/catalogo/componentes/agregar";

export function TarjetaProducto({ producto: p, mayorista }: { producto: ProductoCatalogo; mayorista?: boolean }) {
  return (
    <article className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md" data-testid={`producto-${p.slug}`}>
      <Link href={`/comprador/catalogo/${p.id}`} className="flex gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl" aria-hidden>
          {p.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted-foreground">{p.categoria}</span>
          <span className="line-clamp-2 font-medium leading-snug group-hover:text-primary">{p.nombre}</span>
          <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" /> {p.numeroProveedores} {p.numeroProveedores === 1 ? "proveedor" : "proveedores"} · por {p.unidad}
          </span>
        </span>
      </Link>
      {p.mejor ? (
        <div className="mt-4 rounded-xl bg-muted/60 p-3">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Mejor oferta</p>
              <p className="text-xl font-semibold tracking-tight cifra" data-testid="mejor-precio">
                {soles(p.mejor.precio)}
              </p>
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground" data-testid="mejor-proveedor">
                {p.mejor.proveedor}
                {p.mejor.calificacion > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-300">
                    <Star className="size-3 fill-current" />
                    {p.mejor.calificacion.toFixed(1)}
                  </span>
                )}
              </p>
            </div>
            <div className="text-right">
              {p.ahorro > 0 && (
                <Badge variant="ahorro" data-testid="ahorro">
                  Ahorras {porcentaje(p.ahorro)}
                </Badge>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Promedio <span className="cifra" data-testid="promedio">{soles(p.promedio)}</span>
              </p>
            </div>
          </div>
          {mayorista && p.mejor.escalas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2">
              {p.mejor.escalas.map((e) => (
                <Badge key={e.cantidadMinima} variant="secondary" className="cifra">
                  {e.cantidadMinima}+ a {soles(e.precio)}
                </Badge>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-muted/60 p-3 text-sm text-muted-foreground">Sin stock disponible por ahora.</p>
      )}
      {p.mejor && <AgregarAlPedido ofertaId={p.mejor.id} minimo={p.mejor.pedidoMinimo} className="mt-4" />}
    </article>
  );
}
