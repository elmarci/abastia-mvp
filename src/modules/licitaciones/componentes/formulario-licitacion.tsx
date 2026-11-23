"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gavel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { crearLicitacion } from "@/modules/licitaciones/acciones";
import { CERTIFICADOS, ETIQUETAS_CRITERIO } from "@/modules/licitaciones/esquemas";

type Tipo = keyof typeof ETIQUETAS_CRITERIO;

export function FormularioLicitacion({ cierreSugerido }: { cierreSugerido: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [certificados, setCertificados] = useState<string[]>(["Registro sanitario DIGESA", "BPM"]);
  const [meses, setMeses] = useState("6");
  const [frecuencia, setFrecuencia] = useState<"SEMANAL" | "QUINCENAL" | "MENSUAL">("SEMANAL");
  const [volumen, setVolumen] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [cierre, setCierre] = useState(cierreSugerido);
  const [pesos, setPesos] = useState<Record<Tipo, number>>({ PRECIO: 50, CALIDAD: 25, PLAZO: 15, CALIFICACION: 10 });
  let suma = 0;
  for (const t of Object.keys(pesos) as Tipo[]) suma += pesos[t];

  function publicar() {
    iniciar(async () => {
      const r = await crearLicitacion({
        titulo,
        descripcion,
        certificadosObligatorios: certificados as (typeof CERTIFICADOS)[number][],
        plazoContratoMeses: Number(meses),
        frecuencia,
        volumenEstimado: volumen,
        presupuestoReferencial: presupuesto ? Number(presupuesto) : undefined,
        fechaCierre: new Date(cierre).toISOString(),
        criterios: (Object.keys(pesos) as Tipo[]).map((tipo) => ({ tipo, peso: pesos[tipo] })),
      });
      if (r.ok) {
        toast.success(r.mensaje);
        router.push(`/comprador/licitaciones/${r.datos!.id}`);
      } else toast.error(r.error);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle>Bases</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="lic-titulo">Título</Label>
            <Input id="lic-titulo" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej.: Alimentación del comedor escolar 2027" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lic-desc">Descripción y requisitos</Label>
            <Textarea id="lic-desc" rows={4} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Productos, horarios y lugar de entrega, condiciones…" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lic-meses">Plazo del contrato (meses)</Label>
              <Input id="lic-meses" type="number" min={1} max={36} value={meses} onChange={(e) => setMeses(e.target.value)} className="cifra" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lic-frec">Frecuencia de entrega</Label>
              <SelectNativo id="lic-frec" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as typeof frecuencia)}>
                <option value="SEMANAL">Semanal</option>
                <option value="QUINCENAL">Quincenal</option>
                <option value="MENSUAL">Mensual</option>
              </SelectNativo>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lic-pres">Presupuesto referencial (S/)</Label>
              <Input id="lic-pres" type="number" min={0} value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} className="cifra" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lic-vol">Volumen estimado</Label>
            <Input id="lic-vol" value={volumen} onChange={(e) => setVolumen(e.target.value)} placeholder="Ej.: 600 raciones diarias; S/ 25,000 mensuales aprox." />
          </div>
          <div className="space-y-2">
            <Label>Certificados obligatorios</Label>
            <div className="flex flex-wrap gap-3">
              {CERTIFICADOS.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={certificados.includes(c)} onCheckedChange={(v) => setCertificados((a) => (v === true ? [...a, c] : a.filter((x) => x !== c)))} /> {c}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader className="border-b border-border">
          <CardTitle>Criterios de evaluación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {(Object.keys(pesos) as Tipo[]).map((t) => (
            <div key={t} className="flex items-center gap-3">
              <Label htmlFor={`peso-${t}`} className="flex-1">
                {ETIQUETAS_CRITERIO[t]}
              </Label>
              <Input id={`peso-${t}`} type="number" min={0} max={100} value={pesos[t]} onChange={(e) => setPesos((p) => ({ ...p, [t]: Math.max(0, Math.min(100, Math.floor(Number(e.target.value) || 0))) }))} className="w-20 cifra" />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          ))}
          <p className={cn("text-right text-sm font-medium", suma === 100 ? "text-primary" : "text-destructive")}>Suma: {suma} %</p>
          <div className="space-y-2">
            <Label htmlFor="lic-cierre">Fecha y hora de cierre</Label>
            <Input id="lic-cierre" type="datetime-local" value={cierre} onChange={(e) => setCierre(e.target.value)} />
            <p className="text-xs text-muted-foreground">Las propuestas quedan selladas hasta esa fecha.</p>
          </div>
          <Button size="lg" className="w-full" onClick={publicar} disabled={pendiente || suma !== 100}>
            {pendiente ? <Loader2 className="animate-spin" /> : <Gavel />} Publicar licitación
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
