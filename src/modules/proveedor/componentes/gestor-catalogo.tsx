"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { porcentaje, soles } from "@/lib/formato";
import { cargarCsv, guardarOferta } from "@/modules/proveedor/acciones";

interface Oferta {
  id: string;
  productoId: string;
  producto: string;
  emoji: string;
  unidad: string;
  precio: number;
  stock: number;
  pedidoMinimo: number;
  plazoDias: number;
  activa: boolean;
  competitivo: boolean;
  porEncima: number;
}

const VACIA = { id: "", productoId: "", precio: "", stock: "", pedidoMinimo: "1", plazoDias: "1", activa: true };

export function GestorCatalogo({ ofertas, productos }: { ofertas: Oferta[]; productos: { id: string; nombre: string; emoji: string }[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [form, setForm] = useState<typeof VACIA | null>(null);
  const archivo = useRef<HTMLInputElement>(null);

  function editar(o: Oferta) {
    setForm({ id: o.id, productoId: o.productoId, precio: String(o.precio), stock: String(o.stock), pedidoMinimo: String(o.pedidoMinimo), plazoDias: String(o.plazoDias), activa: o.activa });
  }

  function guardar() {
    if (!form) return;
    iniciar(async () => {
      const r = await guardarOferta({ ...form, id: form.id || undefined, precio: Number(form.precio), stock: Number(form.stock), pedidoMinimo: Number(form.pedidoMinimo), plazoDias: Number(form.plazoDias) });
      if (r.ok) {
        toast.success(r.mensaje);
        setForm(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function subirCsv(f: File) {
    iniciar(async () => {
      const texto = await f.text();
      const r = await cargarCsv(texto);
      if (r.ok && r.datos) {
        toast.success(`${r.datos.guardadas} ofertas guardadas`, { description: r.datos.errores.slice(0, 3).join(" · ") || undefined });
        router.refresh();
      } else if (!r.ok) toast.error(r.error);
      if (archivo.current) archivo.current.value = "";
    });
  }

  const plantilla = "data:text/csv;charset=utf-8," + encodeURIComponent("producto,precio,stock,pedido_minimo,plazo_dias\nArroz extra saco 50 kg,180.50,40,1,2\nAgua de mesa bidón 20 L,12.20,200,5,1\n");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setForm({ ...VACIA })}>
          <Plus /> Nueva oferta
        </Button>
        <Button variant="outline" onClick={() => archivo.current?.click()} disabled={pendiente}>
          {pendiente ? <Loader2 className="animate-spin" /> : <FileUp />} Carga masiva CSV
        </Button>
        <input ref={archivo} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => e.target.files?.[0] && subirCsv(e.target.files[0])} aria-label="Archivo CSV" />
        <Button variant="link" asChild>
          <a href={plantilla} download="plantilla-catalogo-abastia.csv">
            Descargar plantilla
          </a>
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Stock</TableHead>
              <TableHead className="hidden text-right md:table-cell">Mínimo</TableHead>
              <TableHead className="hidden text-right md:table-cell">Plazo</TableHead>
              <TableHead className="hidden sm:table-cell">Competitividad</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ofertas.map((o) => (
              <TableRow key={o.id} className={o.activa ? "" : "opacity-55"}>
                <TableCell>
                  <span className="font-medium">
                    {o.emoji} {o.producto}
                  </span>
                  {!o.activa && <Badge variant="secondary" className="ml-2">Pausada</Badge>}
                </TableCell>
                <TableCell className="text-right font-medium cifra">{soles(o.precio)}</TableCell>
                <TableCell className="hidden text-right cifra sm:table-cell">{o.stock}</TableCell>
                <TableCell className="hidden text-right cifra md:table-cell">{o.pedidoMinimo}</TableCell>
                <TableCell className="hidden text-right cifra md:table-cell">{o.plazoDias} d</TableCell>
                <TableCell className="hidden sm:table-cell">
                  {o.competitivo ? <Badge variant="exito">Competitivo</Badge> : <Badge variant="alerta">{porcentaje(o.porEncima)} por encima</Badge>}
                </TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => editar(o)} aria-label={`Editar ${o.producto}`}>
                    <Pencil />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar oferta" : "Nueva oferta"}</DialogTitle>
            <DialogDescription>El historial de precios se guarda automáticamente para las alertas de precio.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Producto</Label>
                <Select value={form.productoId} onValueChange={(v) => setForm({ ...form, productoId: v })} disabled={!!form.id}>
                  <SelectTrigger>
                    <SelectValue placeholder="Elige un producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.emoji} {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(
                [
                  ["precio", "Precio (S/, con IGV)", "0.01"],
                  ["stock", "Stock", "1"],
                  ["pedidoMinimo", "Pedido mínimo", "1"],
                  ["plazoDias", "Plazo de entrega (días)", "1"],
                ] as const
              ).map(([campo, etiqueta, paso]) => (
                <div key={campo} className="space-y-2">
                  <Label htmlFor={campo}>{etiqueta}</Label>
                  <Input id={campo} type="number" step={paso} min={0} value={form[campo]} onChange={(e) => setForm({ ...form, [campo]: e.target.value })} className="cifra" />
                </div>
              ))}
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch id="activa" checked={form.activa} onCheckedChange={(v) => setForm({ ...form, activa: v })} />
                <Label htmlFor="activa">Oferta activa (visible en el catálogo)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={guardar} disabled={pendiente}>
              {pendiente && <Loader2 className="animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
