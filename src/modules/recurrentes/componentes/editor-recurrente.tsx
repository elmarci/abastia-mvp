"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Switch } from "@/components/ui/switch";
import { soles } from "@/lib/formato";
import { actualizarRecurrente, eliminarRecurrente, ejecutarRecurrenteAhora } from "@/modules/recurrentes/acciones";
import type { RecurrenteVista } from "@/modules/recurrentes/consultas";

type Frecuencia = "SEMANAL" | "QUINCENAL" | "MENSUAL";

/** Edición de un pedido recurrente antes de su próxima ejecución. */
export function EditorRecurrente({ r, fechaMinima }: { r: RecurrenteVista; fechaMinima: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [nombre, setNombre] = useState(r.nombre);
  const [frecuencia, setFrecuencia] = useState<Frecuencia>(r.frecuencia);
  const [proxima, setProxima] = useState(r.proximaEjecucion);
  const [activo, setActivo] = useState(r.activo);
  const [items, setItems] = useState(r.items);
  let total = 0;
  for (const i of items) total += i.precio * i.cantidad;

  function correr(fn: () => Promise<{ ok: true; mensaje?: string; datos?: unknown } | { ok: false; error: string }>, ir?: (d: unknown) => string) {
    iniciar(async () => {
      const res = await fn();
      if (!res.ok) return void toast.error(res.error);
      toast.success(res.mensaje);
      if (ir) router.push(ir(res.datos));
      else router.refresh();
    });
  }

  return (
    <Card data-testid="recurrente">
      <CardHeader className="gap-3 border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-lg">{r.nombre}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={activo ? "exito" : "secondary"}>{activo ? "Activo" : "Pausado"}</Badge>
            <span className="text-sm text-muted-foreground">{r.sede}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor={`nom-${r.id}`} className="text-xs text-muted-foreground">
              Nombre
            </Label>
            <Input id={`nom-${r.id}`} value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`frec-${r.id}`} className="text-xs text-muted-foreground">
              Frecuencia
            </Label>
            <SelectNativo id={`frec-${r.id}`} value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as Frecuencia)}>
              <option value="SEMANAL">Semanal</option>
              <option value="QUINCENAL">Quincenal</option>
              <option value="MENSUAL">Mensual</option>
            </SelectNativo>
          </div>
          <div className="space-y-1">
            <Label htmlFor={`prox-${r.id}`} className="text-xs text-muted-foreground">
              Próxima ejecución
            </Label>
            <Input id={`prox-${r.id}`} type="date" min={fechaMinima} value={proxima} onChange={(e) => setProxima(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Switch checked={activo} onCheckedChange={setActivo} /> Activo
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pt-4">
        {items.map((i, k) => (
          <div key={i.ofertaId} className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center">
            <div className="flex-1">
              {i.producto}
              <span className="block text-xs text-muted-foreground">
                {i.proveedor} · {soles(i.precio)} c/u
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input aria-label={`Cantidad de ${i.producto}`} type="number" min={1} value={i.cantidad} onChange={(e) => setItems((a) => a.map((x, j) => (j === k ? { ...x, cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) } : x)))} className="w-24 cifra" />
              <span className="w-16 text-xs text-muted-foreground">{i.unidadPlural}</span>
              <Button variant="ghost" size="icon" aria-label="Quitar" disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, j) => j !== k))}>
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm">
            Total estimado <span className="font-semibold cifra">{soles(total)}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" className="text-destructive" disabled={pendiente} onClick={() => correr(() => eliminarRecurrente(r.id))}>
              Eliminar
            </Button>
            <Button variant="outline" size="sm" disabled={pendiente} onClick={() => correr(() => ejecutarRecurrenteAhora(r.id), (d) => `/comprador/pedidos/${(d as { id: string }).id}`)} data-testid="ejecutar-ahora">
              <Play /> Generar pedido ahora
            </Button>
            <Button size="sm" disabled={pendiente} onClick={() => correr(() => actualizarRecurrente({ id: r.id, nombre, frecuencia, proximaEjecucion: proxima, activo, items: items.map((i) => ({ ofertaId: i.ofertaId, cantidad: i.cantidad })) }))}>
              {pendiente ? <Loader2 className="animate-spin" /> : <Save />} Guardar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
