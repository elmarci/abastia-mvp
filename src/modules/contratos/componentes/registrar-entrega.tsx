"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Truck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import { registrarEntrega } from "@/modules/contratos/acciones";

export function RegistrarEntrega({ entregaId, fecha, lotes }: { entregaId: string; fecha: string; lotes: { id: string; codigo: string; producto: string }[] }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [loteId, setLoteId] = useState("");
  const [temperatura, setTemperatura] = useState("");
  const [observacion, setObservacion] = useState("");

  function enviar() {
    iniciar(async () => {
      const r = await registrarEntrega({ entregaId, loteId: loteId || undefined, temperatura: temperatura ? Number(temperatura) : undefined, observacion: observacion || undefined });
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
        <Button size="sm" data-testid="registrar-entrega">
          <Truck /> Registrar entrega del {fecha}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrega del {fecha}</DialogTitle>
          <DialogDescription>El lote queda vinculado para la trazabilidad. La temperatura es opcional (preparado para sensores IoT).</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`lote-${entregaId}`}>Lote</Label>
            <SelectNativo id={`lote-${entregaId}`} value={loteId} onChange={(e) => setLoteId(e.target.value)}>
              <option value="">Sin lote</option>
              {lotes.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.codigo} · {l.producto}
                </option>
              ))}
            </SelectNativo>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`temp-${entregaId}`}>Temperatura (°C)</Label>
            <Input id={`temp-${entregaId}`} type="number" step="0.1" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ej.: 4.0" className="w-32 cifra" />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`obs-${entregaId}`}>Observación (opcional)</Label>
            <Textarea id={`obs-${entregaId}`} value={observacion} onChange={(e) => setObservacion(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
