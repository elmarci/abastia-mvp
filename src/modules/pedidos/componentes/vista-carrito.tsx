"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Building2, CreditCard, Landmark, Loader2, Minus, Plus, ShieldCheck, Sparkles, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { porcentaje, soles } from "@/lib/formato";
import { validarFechaEntrega } from "@/lib/negocio/fechas";
import { cn } from "@/lib/utils";
import type { CarritoVista } from "@/modules/pedidos/carrito";
import { actualizarCantidad, confirmarPedido, quitarDelCarrito, vaciarCarrito } from "@/modules/pedidos/acciones-carrito";

type Metodo = "TRANSFERENCIA" | "TARJETA" | "CREDITO_30";

export function VistaCarrito({
  carrito,
  sedes,
  sedeInicial,
  fechaMinima,
  hoy,
  mayorista,
}: {
  carrito: CarritoVista;
  sedes: { id: string; nombre: string; distrito: string; limite: number }[];
  sedeInicial: string;
  fechaMinima: string;
  hoy: string;
  feriados: string[];
  mayorista: boolean;
}) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [sedeId, setSedeId] = useState(sedeInicial);
  const [fecha, setFecha] = useState(fechaMinima);
  const [metodo, setMetodo] = useState<Metodo>("TRANSFERENCIA");
  const [notas, setNotas] = useState("");
  const errorFecha = validarFechaEntrega(fecha, hoy);
  const sede = sedes.find((s) => s.id === sedeId);
  const requiereAprobacion = !!sede && sede.limite > 0 && carrito.totales.total > sede.limite;

  const grupos = useMemo(() => {
    const mapa = new Map<string, { proveedor: string; items: CarritoVista["items"] }>();
    for (const i of carrito.items) {
      const g = mapa.get(i.proveedor.id) ?? { proveedor: i.proveedor.razonSocial, items: [] };
      g.items.push(i);
      mapa.set(i.proveedor.id, g);
    }
    return [...mapa.values()];
  }, [carrito.items]);

  function cambiar(itemId: string, cantidad: number) {
    if (!Number.isInteger(cantidad) || cantidad < 1) return;
    iniciar(async () => {
      const r = await actualizarCantidad(itemId, cantidad);
      if (!r.ok) toast.error(r.error);
      router.refresh();
    });
  }

  function confirmar() {
    iniciar(async () => {
      const r = await confirmarPedido({ sedeId, fechaEntrega: fecha, metodoPago: metodo, notas: notas || undefined });
      if (r.ok && r.datos) {
        toast.success(r.datos.pendiente ? `Pedido ${r.datos.codigo} enviado a aprobación` : `Pedido ${r.datos.codigo} confirmado`);
        router.push(`/comprador/pedidos/${r.datos.id}`);
      } else if (!r.ok) toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        {grupos.map((g) => (
          <Card key={g.proveedor} data-testid="grupo-proveedor">
            <CardHeader className="flex-row items-center justify-between border-b border-border pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Building2 className="size-4 text-primary" /> {g.proveedor}
              </CardTitle>
              <span className="text-sm text-muted-foreground cifra">{soles(g.items.reduce((s, i) => s + i.precioUnitario * i.cantidad, 0))}</span>
            </CardHeader>
            <CardContent className="divide-y divide-border p-0">
              {g.items.map((i) => (
                <div key={i.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center" data-testid="item-carrito">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-2xl" aria-hidden>
                      {i.producto.emoji}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium leading-snug">{i.producto.nombre}</p>
                      <p className="text-xs text-muted-foreground cifra">
                        {soles(i.precioUnitario)} / {i.producto.unidad}
                        {i.precioUnitario < i.precioBase && <span className="ml-1 text-primary">(precio por volumen)</span>} · promedio {soles(i.precioPromedio)}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {i.sugerenciaId && (
                          <Badge variant="info">
                            <Sparkles className="size-3" /> Sugerido por IA: {i.cantidadSugerida}
                          </Badge>
                        )}
                        {i.siguienteEscala && (mayorista || i.siguienteEscala.faltan <= 10) && (
                          <Badge variant="secondary" className="cifra">
                            +{i.siguienteEscala.faltan} para {soles(i.siguienteEscala.precio)} c/u
                          </Badge>
                        )}
                        {i.errores.map((e) => (
                          <Badge key={e} variant="peligro">
                            <AlertTriangle className="size-3" /> {e}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="flex h-9 items-center rounded-xl border border-input">
                      <button className="flex h-full w-8 items-center justify-center hover:bg-muted disabled:opacity-40" onClick={() => cambiar(i.id, i.cantidad - 1)} disabled={pendiente || i.cantidad <= 1} aria-label={`Disminuir ${i.producto.nombre}`}>
                        <Minus className="size-3.5" />
                      </button>
                      <CantidadEditable valor={i.cantidad} onCambiar={(v) => cambiar(i.id, v)} etiqueta={`Cantidad de ${i.producto.nombre}`} />
                      <button className="flex h-full w-8 items-center justify-center hover:bg-muted" onClick={() => cambiar(i.id, i.cantidad + 1)} disabled={pendiente} aria-label={`Aumentar ${i.producto.nombre}`}>
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                    <p className="w-24 text-right font-medium cifra">{soles(i.precioUnitario * i.cantidad)}</p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Quitar ${i.producto.nombre}`}
                      onClick={() =>
                        iniciar(async () => {
                          await quitarDelCarrito(i.id);
                          router.refresh();
                        })
                      }
                    >
                      <Trash2 className="text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() =>
            iniciar(async () => {
              await vaciarCarrito();
              router.refresh();
            })
          }
        >
          <Trash2 /> Vaciar pedido
        </Button>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm" data-testid="resumen-carrito">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Proveedores</dt>
                <dd className="cifra" data-testid="numero-proveedores">{carrito.totales.numeroProveedores}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotal (valor de venta)</dt>
                <dd className="cifra" data-testid="subtotal">{soles(carrito.totales.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">IGV 18 %</dt>
                <dd className="cifra" data-testid="igv">{soles(carrito.totales.igv)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <dt>Total</dt>
                <dd className="cifra" data-testid="total">{soles(carrito.totales.total)}</dd>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-accent/12 px-3 py-2 text-amber-800 dark:text-amber-200">
                <dt className="text-sm">Ahorro estimado vs. promedio</dt>
                <dd className="font-semibold cifra" data-testid="ahorro-carrito">
                  {soles(carrito.totales.ahorro)} ({porcentaje(carrito.totales.porcentajeAhorro)})
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <Label htmlFor="sede">Sede de entrega</Label>
              <Select value={sedeId} onValueChange={setSedeId}>
                <SelectTrigger id="sede">
                  <SelectValue placeholder="Elige una sede" />
                </SelectTrigger>
                <SelectContent>
                  {sedes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nombre} · {s.distrito}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de entrega deseada</Label>
              <Input id="fecha" type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} aria-invalid={!!errorFecha} data-testid="fecha-entrega" />
              {errorFecha ? <p className="text-xs text-destructive">{errorFecha}</p> : <p className="text-xs text-muted-foreground">Sin domingos ni feriados. Mínimo el día siguiente.</p>}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Forma de pago</Label>
                <Badge variant="alerta">Pago simulado</Badge>
              </div>
              <div className="grid gap-2" role="radiogroup" aria-label="Forma de pago">
                {(
                  [
                    ["TRANSFERENCIA", "Transferencia", Landmark, false],
                    ["TARJETA", "Tarjeta", CreditCard, false],
                    ["CREDITO_30", "Crédito 30 días (próximamente)", Wallet, true],
                  ] as const
                ).map(([valor, texto, Icono, deshabilitado]) => (
                  <button
                    key={valor}
                    type="button"
                    role="radio"
                    aria-checked={metodo === valor}
                    disabled={deshabilitado}
                    onClick={() => setMetodo(valor)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
                      metodo === valor && "border-primary bg-secondary/50",
                    )}
                  >
                    <Icono className="size-4 text-muted-foreground" />
                    {texto}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">No se realiza ningún cobro real: el pago es una simulación del MVP.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas para los proveedores (opcional)</Label>
              <Textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej.: entregar por la puerta de servicio" maxLength={500} />
            </div>
            {requiereAprobacion && (
              <div className="flex gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200" data-testid="aviso-aprobacion">
                <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                El total supera el monto límite de la sede ({soles(sede!.limite)}). El pedido quedará pendiente de aprobación.
              </div>
            )}
            <Button size="lg" className="w-full" onClick={confirmar} disabled={pendiente || !carrito.valido || !!errorFecha || !sedeId} data-testid="confirmar-pedido">
              {pendiente && <Loader2 className="animate-spin" />}
              {requiereAprobacion ? "Enviar a aprobación" : "Confirmar pedido"}
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function CantidadEditable({ valor, onCambiar, etiqueta }: { valor: number; onCambiar: (v: number) => void; etiqueta: string }) {
  const [texto, setTexto] = useState(String(valor));
  const [previo, setPrevio] = useState(valor);
  if (previo !== valor) {
    setPrevio(valor);
    setTexto(String(valor));
  }
  return (
    <input
      value={texto}
      inputMode="numeric"
      onChange={(e) => setTexto(e.target.value.replace(/[^0-9]/g, ""))}
      onBlur={() => {
        const n = Number(texto);
        if (Number.isInteger(n) && n > 0 && n !== valor) onCambiar(n);
        else setTexto(String(valor));
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="h-full w-11 bg-transparent text-center text-sm outline-none cifra"
      aria-label={etiqueta}
    />
  );
}
