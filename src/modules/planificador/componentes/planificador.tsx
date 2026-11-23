"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Brain, CalendarDays, Info, Loader2, ShoppingCart, Users } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { soles } from "@/lib/formato";
import {
  cantidadSugerida,
  ETIQUETAS_NIVEL,
  explicarSugerencia,
  nivelStock,
  pronosticoHolt,
  pronosticoSemanal,
  type NivelStock,
} from "@/lib/negocio";
import type { FilaPlanificador } from "@/modules/planificador/consultas";
import { agregarSugerencias, guardarStock } from "@/modules/planificador/acciones";
import { cn } from "@/lib/utils";

const VARIANTE_NIVEL: Record<NivelStock, "peligro" | "alerta" | "exito"> = { SIN_STOCK: "peligro", STOCK_BAJO: "alerta", SUFICIENTE: "exito" };

export function Planificador({ sede, filas }: { sede: { id: string; nombre: string; personas: number; personasBase: number }; filas: FilaPlanificador[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [personas, setPersonas] = useState(sede.personas);
  const [dias, setDias] = useState(7);
  const [usarHolt, setUsarHolt] = useState(false);
  const [stocks, setStocks] = useState<Record<string, number>>(() => Object.fromEntries(filas.map((f) => [f.productoId, f.stock])));
  const [seleccion, setSeleccion] = useState<Record<string, boolean>>({});

  // Recalcula al instante con la lógica de negocio pura (la misma que valida el servidor)
  const calculo = useMemo(
    () =>
      filas.map((f) => {
        const stock = stocks[f.productoId] ?? 0;
        const holt = usarHolt ? pronosticoHolt(f.historial, personas, sede.personasBase) : null;
        const pronostico = holt ?? pronosticoSemanal(f.historial, personas, sede.personasBase);
        const sugerida = cantidadSugerida(pronostico, dias, stock);
        return {
          ...f,
          stock,
          ultimas4: f.historial.slice(-4),
          pronostico,
          modelo: holt !== null ? "Holt" : "Base",
          sugerida,
          nivel: nivelStock(stock, pronostico),
          explicacion: explicarSugerencia({ producto: f.nombre, unidad: f.unidadPlural, sugerida, pronostico, personas, stock, dias }),
        };
      }),
    [filas, stocks, personas, dias, usarHolt, sede.personasBase],
  );

  const conSugerencia = calculo.filter((c) => c.sugerida > 0 && c.mejorOferta);
  const elegidas = conSugerencia.filter((c) => seleccion[c.productoId] ?? true);
  const costo = elegidas.reduce((s, c) => s + c.sugerida * (c.mejorOferta?.precio ?? 0), 0);
  const alertas = calculo.filter((c) => c.nivel !== "SUFICIENTE").length;

  function agregar(soloSeleccion: boolean) {
    const lista = soloSeleccion ? elegidas : conSugerencia;
    iniciar(async () => {
      const r = await agregarSugerencias({
        sedeId: sede.id,
        personas,
        dias,
        modelo: usarHolt ? "HOLT" : "BASE",
        items: lista.map((c) => ({ productoId: c.productoId, ofertaId: c.mejorOferta!.id, stock: c.stock, pronostico: c.pronostico, cantidadSugerida: c.sugerida })),
      });
      if (r.ok) {
        toast.success(`${r.datos?.agregadas} sugerencias agregadas al pedido`, {
          description: r.datos?.ajustadas ? `${r.datos.ajustadas} se subieron al pedido mínimo del proveedor.` : undefined, action: { label: "Ver pedido", onClick: () => router.push("/comprador/carrito") } });
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Sede</p>
            <p className="mt-1 font-medium">{sede.nombre}</p>
            <p className="text-xs text-muted-foreground">Historial registrado con {sede.personasBase} personas</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="personas" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="size-3.5" /> Personas atendidas
            </Label>
            <Input id="personas" type="number" min={1} value={personas} onChange={(e) => setPersonas(Math.max(1, Math.floor(Number(e.target.value) || 1)))} className="cifra" data-testid="personas" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dias" className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" /> Días a cubrir
            </Label>
            <Input id="dias" type="number" min={1} max={90} value={dias} onChange={(e) => setDias(Math.min(90, Math.max(1, Math.floor(Number(e.target.value) || 1))))} className="cifra" data-testid="dias" />
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Brain className="size-3.5" /> Modelo de pronóstico
            </p>
            <div className="flex h-10 items-center gap-2">
              <Switch id="holt" checked={usarHolt} onCheckedChange={setUsarHolt} aria-label="Usar suavizamiento exponencial Holt" />
              <Label htmlFor="holt" className="text-sm font-normal">
                {usarHolt ? "Holt (≥ 8 semanas)" : "Base: promedio ponderado"}
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-2xl border border-primary/20 bg-secondary/50 p-4 sm:flex-row sm:items-center">
        <div className="flex-1 text-sm">
          <p className="font-medium">
            {conSugerencia.length} productos por reponer · costo estimado <span className="cifra">{soles(costo)}</span>
          </p>
          <p className="text-muted-foreground">{alertas} productos con stock bajo o sin stock. Ajusta tu stock actual en cada fila.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => agregar(true)} disabled={pendiente || elegidas.length === 0} data-testid="agregar-seleccionadas">
            Agregar seleccionadas ({elegidas.length})
          </Button>
          <Button onClick={() => agregar(false)} disabled={pendiente || conSugerencia.length === 0} data-testid="agregar-sugerencias">
            {pendiente ? <Loader2 className="animate-spin" /> : <ShoppingCart />} Agregar sugerencias al pedido
          </Button>
        </div>
      </div>

      <div className="hidden grid-cols-[28px_minmax(0,2.2fr)_1.2fr_0.8fr_0.9fr_0.8fr_1fr] gap-3 px-4 text-xs font-medium uppercase tracking-wide text-muted-foreground lg:grid">
        <span />
        <span>Producto</span>
        <span>Últimas 4 semanas</span>
        <span className="text-right">Pronóstico</span>
        <span className="text-center">Stock</span>
        <span className="text-right">Sugerencia</span>
        <span className="text-right">Nivel</span>
      </div>
      <div className="space-y-2">
        {calculo.map((c) => {
          const maximo = Math.max(...c.ultimas4, 1);
          const marcado = c.sugerida > 0 && (seleccion[c.productoId] ?? true);
          return (
            <div key={c.productoId} className="rounded-2xl border border-border bg-card p-4 shadow-xs" data-testid={`fila-${c.slug}`}>
              <div className="grid grid-cols-[28px_1fr] gap-3 lg:grid-cols-[28px_minmax(0,2.2fr)_1.2fr_0.8fr_0.9fr_0.8fr_1fr] lg:items-center">
                <Checkbox
                  checked={marcado}
                  disabled={c.sugerida === 0 || !c.mejorOferta}
                  onCheckedChange={(v) => setSeleccion((s) => ({ ...s, [c.productoId]: v === true }))}
                  aria-label={`Seleccionar ${c.nombre}`}
                  className="mt-1 lg:mt-0"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-medium">
                    <span aria-hidden>{c.emoji}</span> <span className="truncate">{c.nombre}</span>
                  </p>
                  <p className="mt-0.5 flex items-start gap-1 text-xs text-muted-foreground" data-testid="explicacion">
                    <Info className="mt-0.5 size-3 shrink-0" /> {c.explicacion}
                  </p>
                </div>
                <div className="col-span-2 grid grid-cols-2 gap-3 sm:grid-cols-5 lg:contents">
                  <div className="flex h-10 items-end gap-1" aria-label={`Consumo: ${c.ultimas4.join(", ")}`}>
                    {c.ultimas4.map((v, i) => (
                      <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
                        <div className="w-full rounded-sm bg-primary/70" style={{ height: `${Math.max(8, (v / maximo) * 28)}px` }} />
                        <span className="text-[10px] text-muted-foreground cifra">{v}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground lg:hidden">Pronóstico</p>
                    <p className="font-medium cifra" data-testid="pronostico">
                      {c.pronostico.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.modelo} · por semana</p>
                  </div>
                  <div className="flex flex-col items-center">
                    <p className="text-[11px] text-muted-foreground lg:hidden">Stock</p>
                    <Input
                      type="number"
                      min={0}
                      value={c.stock}
                      onChange={(e) => setStocks((s) => ({ ...s, [c.productoId]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                      onBlur={() => guardarStock({ sedeId: sede.id, productoId: c.productoId, cantidad: c.stock })}
                      className="h-9 w-20 text-center cifra"
                      aria-label={`Stock actual de ${c.nombre}`}
                      data-testid="stock"
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground lg:hidden">Sugerencia</p>
                    <p className={cn("text-lg font-semibold cifra", c.sugerida > 0 ? "text-primary" : "text-muted-foreground")} data-testid="sugerida">
                      {c.sugerida}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{c.unidadPlural}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant={VARIANTE_NIVEL[c.nivel]} data-testid="nivel">
                      {ETIQUETAS_NIVEL[c.nivel]}
                    </Badge>
                    {c.mejorOferta && <p className="mt-1 truncate text-[10px] text-muted-foreground cifra">{soles(c.mejorOferta.precio)} · {c.mejorOferta.proveedor.split(" ")[0]}</p>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
