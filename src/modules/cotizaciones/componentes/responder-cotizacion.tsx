"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { soles } from "@/lib/formato";
import { responderSolicitud } from "@/modules/cotizaciones/acciones";

interface Props {
  solicitudId: string;
  codigo: string;
  items: { id: string; cantidad: number; producto: { nombre: string; emoji: string; unidadPlural: string }; precioSugerido: number }[];
  propia: { plazoDias: number; condiciones: string } | null;
}

export function ResponderCotizacion({ solicitudId, codigo, items, propia }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [precios, setPrecios] = useState<Record<string, string>>(Object.fromEntries(items.map((i) => [i.id, i.precioSugerido ? i.precioSugerido.toFixed(2) : ""])));
  const [plazo, setPlazo] = useState(String(propia?.plazoDias ?? 1));
  const [condiciones, setCondiciones] = useState(propia?.condiciones ?? "");
  let total = 0;
  for (const i of items) total += (Number(precios[i.id]) || 0) * i.cantidad;

  function enviar() {
    iniciar(async () => {
      const r = await responderSolicitud({
        solicitudId,
        plazoDias: Number(plazo),
        condiciones,
        precios: items.map((i) => ({ itemSolicitudId: i.id, precioUnitario: Number(precios[i.id]) })),
      });
      if (r.ok) {
        toast.success(r.mensaje);
        setAbierto(false);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button size="sm" variant={propia ? "outline" : "default"} data-testid="responder-cotizacion">
          <Send /> {propia ? "Actualizar cotización" : "Cotizar"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Cotizar {codigo}</DialogTitle>
          <DialogDescription>Precio unitario con IGV de cada producto.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {items.map((i) => (
            <div key={i.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">
                {i.producto.emoji} {i.cantidad} {i.producto.unidadPlural} · {i.producto.nombre}
              </span>
              <Input aria-label={`Precio de ${i.producto.nombre}`} type="number" step="0.01" min={0} value={precios[i.id]} onChange={(e) => setPrecios((p) => ({ ...p, [i.id]: e.target.value }))} className="w-28 cifra" />
            </div>
          ))}
          <div className="grid grid-cols-[120px_1fr] items-center gap-3">
            <Label htmlFor={`plazo-${solicitudId}`}>Plazo (días)</Label>
            <Input id={`plazo-${solicitudId}`} type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} className="w-24 cifra" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`cond-${solicitudId}`}>Condiciones</Label>
            <Textarea id={`cond-${solicitudId}`} value={condiciones} onChange={(e) => setCondiciones(e.target.value)} placeholder="Ej.: entrega sin costo, pago a 15 días" />
          </div>
          <p className="text-right text-sm">
            Total <span className="font-semibold cifra">{soles(total)}</span>
          </p>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={pendiente} data-testid="enviar-cotizacion">
            {pendiente && <Loader2 className="animate-spin" />} Enviar cotización
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
