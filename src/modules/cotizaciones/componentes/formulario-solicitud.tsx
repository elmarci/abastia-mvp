"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { crearSolicitud } from "@/modules/cotizaciones/acciones";

interface Props {
  sedes: { id: string; nombre: string }[];
  sedeInicial: string;
  fechaMinima: string;
  productos: { id: string; nombre: string; emoji: string; unidadPlural: string; categoria: string }[];
  proveedores: { id: string; razonSocial: string }[];
}

export function FormularioSolicitud({ sedes, sedeInicial, fechaMinima, productos, proveedores }: Props) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [sedeId, setSedeId] = useState(sedeInicial);
  const [fecha, setFecha] = useState(fechaMinima);
  const [items, setItems] = useState([{ productoId: "", cantidad: 1 }]);
  const [todos, setTodos] = useState(true);
  const [elegidos, setElegidos] = useState<string[]>([]);
  const categorias = [...new Set(productos.map((p) => p.categoria))];

  function cambiar(i: number, cambio: Partial<{ productoId: string; cantidad: number }>) {
    setItems((actual) => actual.map((it, j) => (j === i ? { ...it, ...cambio } : it)));
  }

  function enviar() {
    iniciar(async () => {
      const r = await crearSolicitud({ titulo, sedeId, fechaRequerida: fecha, items, proveedorIds: todos ? [] : elegidos });
      if (r.ok) {
        toast.success(r.mensaje);
        router.push(`/comprador/cotizaciones/${r.datos!.id}`);
      } else toast.error(r.error);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Productos y cantidades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-4">
          {items.map((it, i) => (
            <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center" data-testid="item-solicitud">
              <SelectNativo aria-label={`Producto ${i + 1}`} value={it.productoId} onChange={(e) => cambiar(i, { productoId: e.target.value })} className="sm:flex-1">
                <option value="">Elige un producto…</option>
                {categorias.map((c) => (
                  <optgroup key={c} label={c}>
                    {productos
                      .filter((p) => p.categoria === c)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.emoji} {p.nombre}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </SelectNativo>
              <div className="flex items-center gap-2">
                <Input aria-label={`Cantidad ${i + 1}`} type="number" min={1} value={it.cantidad} onChange={(e) => cambiar(i, { cantidad: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className="w-28 cifra" />
                <span className="w-16 truncate text-xs text-muted-foreground">{productos.find((p) => p.id === it.productoId)?.unidadPlural ?? ""}</span>
                <Button variant="ghost" size="icon" aria-label="Quitar producto" disabled={items.length === 1} onClick={() => setItems((a) => a.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setItems((a) => [...a, { productoId: "", cantidad: 1 }])} disabled={items.length >= 30}>
            <Plus /> Agregar producto
          </Button>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título</Label>
            <Input id="titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Cafetería de diciembre" maxLength={120} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sede-rfq">Sede</Label>
            <SelectNativo id="sede-rfq" value={sedeId} onChange={(e) => setSedeId(e.target.value)}>
              {sedes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </SelectNativo>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fecha-rfq">Fecha requerida</Label>
            <Input id="fecha-rfq" type="date" min={fechaMinima} value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Proveedores</Label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={todos} onCheckedChange={(v) => setTodos(v === true)} /> Todos los homologados de la categoría
            </label>
            {!todos && (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-xl border border-border p-3">
                {proveedores.map((p) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={elegidos.includes(p.id)} onCheckedChange={(v) => setElegidos((a) => (v === true ? [...a, p.id] : a.filter((x) => x !== p.id)))} />
                    {p.razonSocial}
                  </label>
                ))}
              </div>
            )}
          </div>
          <Button size="lg" className="w-full" onClick={enviar} disabled={pendiente} data-testid="enviar-solicitud">
            {pendiente ? <Loader2 className="animate-spin" /> : <Send />} Enviar solicitud
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
