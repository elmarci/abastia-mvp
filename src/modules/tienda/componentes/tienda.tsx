"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, Landmark, Loader2, Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { soles } from "@/lib/formato";
import { porcentajeAhorro, validarFechaEntrega } from "@/lib/negocio";
import { DISTRITOS_LIMA } from "@/lib/negocio/validadores";
import { cn } from "@/lib/utils";
import { comprarRetail } from "@/modules/tienda/acciones";
import type { ProductoTienda } from "@/modules/tienda/consultas";

const CLAVE = "abastia_tienda";
type Carrito = Record<string, number>;

function leer(): Carrito {
  try {
    const v = JSON.parse(window.localStorage.getItem(CLAVE) ?? "{}");
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
function guardar(c: Carrito) {
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(c));
  } catch {
    /* almacenamiento no disponible: el carrito vive solo en memoria */
  }
}

interface Props {
  productos: ProductoTienda[];
  cliente: { nombre: string; direccion: string | null; distrito: string | null } | null;
  esOtroRol: boolean;
  fechaMinima: string;
}

export function Tienda({ productos, cliente, esOtroRol, fechaMinima }: Props) {
  const router = useRouter();
  const [carrito, setCarrito] = useState<Carrito>({});
  const [q, setQ] = useState("");
  const [categoria, setCategoria] = useState("");
  const [direccion, setDireccion] = useState(cliente?.direccion ?? "");
  const [distrito, setDistrito] = useState(cliente?.distrito ?? "Miraflores");
  const [fecha, setFecha] = useState(fechaMinima);
  const [metodo, setMetodo] = useState<"TARJETA" | "TRANSFERENCIA">("TARJETA");
  const [pendiente, iniciar] = useTransition();

  useEffect(() => {
    setCarrito(leer());
  }, []);
  function cambiar(ofertaId: string, delta: number) {
    setCarrito((c) => {
      const n = { ...c, [ofertaId]: Math.max(0, Math.min(200, (c[ofertaId] ?? 0) + delta)) };
      if (n[ofertaId] === 0) delete n[ofertaId];
      guardar(n);
      return n;
    });
  }

  const categorias = useMemo(() => [...new Set(productos.map((p) => p.categoria))], [productos]);
  const visibles = productos.filter((p) => (!categoria || p.categoria === categoria) && p.nombre.toLowerCase().includes(q.trim().toLowerCase()));
  const lineas = productos.filter((p) => carrito[p.ofertaId]).map((p) => ({ ...p, cantidad: carrito[p.ofertaId] }));
  let total = 0;
  let mercado = 0;
  for (const l of lineas) {
    total += l.precio * l.cantidad;
    mercado += l.promedio * l.cantidad;
  }
  const errorFecha = validarFechaEntrega(fecha);

  function pagar() {
    iniciar(async () => {
      const r = await comprarRetail({ items: lineas.map((l) => ({ ofertaId: l.ofertaId, cantidad: l.cantidad })), direccion, distrito, fechaEntrega: fecha, metodoPago: metodo });
      if (r.ok) {
        guardar({});
        setCarrito({});
        toast.success(r.mensaje);
        router.push(`/cuenta/pedidos/${r.datos!.id}`);
      } else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar arroz, leche, huevos…" className="pl-9" aria-label="Buscar productos" />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
          {["", ...categorias].map((c) => (
            <button key={c || "todas"} onClick={() => setCategoria(c)} className={cn("shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted", categoria === c && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}>
              {c || "Todo"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => {
            const ahorro = porcentajeAhorro(p.promedio, p.precio);
            const cantidad = carrito[p.ofertaId] ?? 0;
            return (
              <article key={p.ofertaId} className="flex flex-col rounded-2xl border border-border bg-card p-3 shadow-xs" data-testid={`tienda-${p.productoId}`}>
                <span className="mb-2 flex h-16 items-center justify-center rounded-xl bg-muted text-4xl" aria-hidden>
                  {p.emoji}
                </span>
                <p className="line-clamp-2 text-sm font-medium leading-snug">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">por {p.unidad}</p>
                <div className="mt-auto flex items-end justify-between gap-1 pt-2">
                  <p className="text-lg font-semibold cifra">{soles(p.precio)}</p>
                  {ahorro > 0.005 && <Badge variant="ahorro">-{(ahorro * 100).toFixed(0)} %</Badge>}
                </div>
                {cantidad === 0 ? (
                  <Button size="sm" className="mt-2" onClick={() => cambiar(p.ofertaId, 1)} data-testid="agregar-tienda">
                    <Plus /> Agregar
                  </Button>
                ) : (
                  <div className="mt-2 flex items-center justify-between rounded-xl border border-border">
                    <Button size="icon" variant="ghost" aria-label="Quitar uno" onClick={() => cambiar(p.ofertaId, -1)}>
                      <Minus />
                    </Button>
                    <span className="text-sm font-semibold cifra">{cantidad}</span>
                    <Button size="icon" variant="ghost" aria-label="Agregar uno" onClick={() => cambiar(p.ofertaId, 1)}>
                      <Plus />
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <aside className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="size-4" /> Tu canasta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {lineas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Agrega productos para armar tu canasta. Entregamos a domicilio en Lima.</p>
            ) : (
              <>
                <ul className="space-y-2 text-sm" data-testid="canasta">
                  {lineas.map((l) => (
                    <li key={l.ofertaId} className="flex items-center gap-2">
                      <span className="flex-1">
                        {l.cantidad} × {l.emoji} {l.nombre}
                      </span>
                      <span className="cifra">{soles(l.precio * l.cantidad)}</span>
                      <button aria-label={`Quitar ${l.nombre}`} onClick={() => cambiar(l.ofertaId, -l.cantidad)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <p className="flex justify-between">
                    Total (IGV incluido) <span className="font-semibold cifra" data-testid="total-tienda">{soles(total)}</span>
                  </p>
                  {mercado > total && (
                    <p className="flex justify-between text-primary">
                      Ahorro frente al promedio <span className="cifra">{soles(mercado - total)}</span>
                    </p>
                  )}
                </div>
                {cliente ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="t-dir">Dirección de entrega</Label>
                      <Input id="t-dir" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="t-dist">Distrito</Label>
                        <SelectNativo id="t-dist" value={distrito} onChange={(e) => setDistrito(e.target.value)}>
                          {DISTRITOS_LIMA.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </SelectNativo>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="t-fecha">Entrega</Label>
                        <Input id="t-fecha" type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                      </div>
                    </div>
                    {errorFecha && <p className="text-xs text-destructive">{errorFecha}</p>}
                    <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Forma de pago">
                      {(
                        [
                          ["TARJETA", "Tarjeta", CreditCard],
                          ["TRANSFERENCIA", "Yape / transferencia", Landmark],
                        ] as const
                      ).map(([v, t, Icono]) => (
                        <button key={v} role="radio" aria-checked={metodo === v} onClick={() => setMetodo(v)} className={cn("flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted", metodo === v && "border-primary bg-secondary/50")}>
                          <Icono className="size-4 text-muted-foreground" /> {t}
                        </button>
                      ))}
                    </div>
                    <Button size="lg" className="w-full" disabled={pendiente || !!errorFecha} onClick={pagar} data-testid="pagar-tienda">
                      {pendiente && <Loader2 className="animate-spin" />} Pagar {soles(total)}
                    </Button>
                    <p className="text-center text-xs text-muted-foreground">Pago simulado: no se realiza ningún cobro.</p>
                  </div>
                ) : esOtroRol ? (
                  <p className="rounded-xl bg-muted p-3 text-sm">La tienda es para consumidores finales. Las empresas compran desde su panel.</p>
                ) : (
                  <div className="space-y-2">
                    <Button asChild size="lg" className="w-full">
                      <Link href="/login?callbackUrl=/tienda">Ingresa para pagar</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/registro?tipo=consumidor">Crear cuenta gratis</Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
