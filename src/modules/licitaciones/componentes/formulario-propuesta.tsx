"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { enviarPropuesta } from "@/modules/licitaciones/acciones";
import { CERTIFICADOS } from "@/modules/licitaciones/esquemas";

interface Props {
  licitacionId: string;
  codigo: string;
  propia: { montoTotal: number; plazoEntregaDias: number; certificados: string[]; descripcion: string } | null;
}

export function FormularioPropuesta({ licitacionId, codigo, propia }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [monto, setMonto] = useState(propia ? String(propia.montoTotal) : "");
  const [plazo, setPlazo] = useState(String(propia?.plazoEntregaDias ?? 1));
  const [certificados, setCertificados] = useState<string[]>(propia?.certificados ?? []);
  const [descripcion, setDescripcion] = useState(propia?.descripcion ?? "");

  function enviar() {
    iniciar(async () => {
      const r = await enviarPropuesta({ licitacionId, montoTotal: Number(monto), plazoEntregaDias: Number(plazo), certificados: certificados as (typeof CERTIFICADOS)[number][], descripcion });
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
        <Button size="sm" variant={propia ? "outline" : "default"} data-testid="presentar-propuesta">
          <Send /> {propia ? "Actualizar propuesta" : "Presentar propuesta"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Propuesta para {codigo}</DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <Lock className="size-3.5" /> Queda sellada: la entidad la verá recién al cierre.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor={`monto-${licitacionId}`}>Monto total (S/)</Label>
              <Input id={`monto-${licitacionId}`} type="number" min={0} value={monto} onChange={(e) => setMonto(e.target.value)} className="cifra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`plazo-l-${licitacionId}`}>Plazo de entrega (días)</Label>
              <Input id={`plazo-l-${licitacionId}`} type="number" min={1} value={plazo} onChange={(e) => setPlazo(e.target.value)} className="cifra" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Certificados que presentas</Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {CERTIFICADOS.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={certificados.includes(c)} onCheckedChange={(v) => setCertificados((a) => (v === true ? [...a, c] : a.filter((x) => x !== c)))} /> {c}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`desc-l-${licitacionId}`}>Descripción</Label>
            <Textarea id={`desc-l-${licitacionId}`} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Logística, cadena de frío, experiencia con instituciones…" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={pendiente} data-testid="enviar-propuesta">
            {pendiente && <Loader2 className="animate-spin" />} Enviar propuesta sellada
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
