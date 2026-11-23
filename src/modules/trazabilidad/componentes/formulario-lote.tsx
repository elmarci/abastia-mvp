"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { crearLote } from "@/modules/trazabilidad/acciones";

const VACIO = { tipo: "Registro sanitario DIGESA", numero: "", emisor: "DIGESA – Ministerio de Salud", vigencia: "" };

export function FormularioLote({ ofertas, hoy }: { ofertas: { id: string; producto: string }[]; hoy: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  const [ofertaId, setOfertaId] = useState(ofertas[0]?.id ?? "");
  const [produccion, setProduccion] = useState(hoy);
  const [vencimiento, setVencimiento] = useState("");
  const [origen, setOrigen] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [certificados, setCertificados] = useState([{ ...VACIO }]);

  function cambiar(i: number, campo: keyof typeof VACIO, valor: string) {
    setCertificados((a) => a.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));
  }

  function guardar() {
    iniciar(async () => {
      const r = await crearLote({ ofertaId, fechaProduccion: produccion, fechaVencimiento: vencimiento, origen, descripcionOrigen: descripcion || undefined, certificados: certificados.filter((c) => c.numero.trim()) });
      if (r.ok) {
        toast.success(`${r.mensaje}: ${r.datos!.codigo}`);
        setAbierto(false);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Nuevo lote
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar lote</DialogTitle>
          <DialogDescription>Se genera un código y una página pública con QR para auditorías.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="lote-oferta">Producto</Label>
            <SelectNativo id="lote-oferta" value={ofertaId} onChange={(e) => setOfertaId(e.target.value)}>
              {ofertas.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.producto}
                </option>
              ))}
            </SelectNativo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="lote-prod">Producción</Label>
              <Input id="lote-prod" type="date" max={hoy} value={produccion} onChange={(e) => setProduccion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lote-venc">Vencimiento</Label>
              <Input id="lote-venc" type="date" min={produccion} value={vencimiento} onChange={(e) => setVencimiento(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="lote-origen">Origen</Label>
            <Input id="lote-origen" value={origen} onChange={(e) => setOrigen(e.target.value)} placeholder="Ej.: Planta Huaral, Lima" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lote-desc">Descripción (opcional)</Label>
            <Input id="lote-desc" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Certificados</Label>
            {certificados.map((c, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3">
                <Input aria-label="Tipo" value={c.tipo} onChange={(e) => cambiar(i, "tipo", e.target.value)} placeholder="Tipo (BPM, DIGESA…)" />
                <Input aria-label="Número" value={c.numero} onChange={(e) => cambiar(i, "numero", e.target.value)} placeholder="Número" />
                <Input aria-label="Emisor" value={c.emisor} onChange={(e) => cambiar(i, "emisor", e.target.value)} placeholder="Emisor" />
                <div className="flex gap-1">
                  <Input aria-label="Vigencia" type="date" value={c.vigencia} onChange={(e) => cambiar(i, "vigencia", e.target.value)} />
                  <Button variant="ghost" size="icon" aria-label="Quitar certificado" onClick={() => setCertificados((a) => a.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" disabled={certificados.length >= 5} onClick={() => setCertificados((a) => [...a, { ...VACIO, tipo: "BPM", emisor: "" }])}>
              <Plus /> Agregar certificado
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={guardar} disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Registrar lote
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
