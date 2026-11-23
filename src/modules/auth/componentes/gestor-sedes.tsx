"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin, Pencil, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { soles } from "@/lib/formato";
import { DISTRITOS_LIMA } from "@/lib/negocio/validadores";
import { guardarSede } from "@/modules/auth/acciones-sedes";

interface Sede {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string;
  personas: number;
  montoLimiteAprobacion: number;
}

export function GestorSedes({ sedes, esAprobador }: { sedes: Sede[]; esAprobador: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [form, setForm] = useState<(Omit<Sede, "id" | "personas" | "montoLimiteAprobacion"> & { id?: string; personas: string; montoLimiteAprobacion: string }) | null>(null);

  function guardar() {
    if (!form) return;
    iniciar(async () => {
      const r = await guardarSede({ ...form, personas: Number(form.personas), montoLimiteAprobacion: Number(form.montoLimiteAprobacion) });
      if (r.ok) {
        toast.success(r.mensaje);
        setForm(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <Button className="mb-4" onClick={() => setForm({ nombre: "", direccion: "", distrito: "San Isidro", personas: "50", montoLimiteAprobacion: "2000" })}>
        <Plus /> Nueva sede
      </Button>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sedes.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-start gap-4 p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <MapPin className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{s.nombre}</p>
                <p className="text-sm text-muted-foreground">
                  {s.direccion}, {s.distrito}
                </p>
                <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
                  <span className="inline-flex items-center gap-1">
                    <Users className="size-4 text-muted-foreground" /> {s.personas} personas
                  </span>
                  <span>Límite de aprobación: <span className="font-medium cifra">{s.montoLimiteAprobacion > 0 ? soles(s.montoLimiteAprobacion) : "sin límite"}</span></span>
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label={`Editar ${s.nombre}`} onClick={() => setForm({ ...s, personas: String(s.personas), montoLimiteAprobacion: String(s.montoLimiteAprobacion) })}>
                <Pencil />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <Dialog open={form !== null} onOpenChange={(v) => !v && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{form?.id ? "Editar sede" : "Nueva sede"}</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sn">Nombre</Label>
                <Input id="sn" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sd">Dirección</Label>
                <Input id="sd" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Distrito</Label>
                <Select value={form.distrito} onValueChange={(v) => setForm({ ...form, distrito: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTRITOS_LIMA.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp">Personas atendidas</Label>
                <Input id="sp" type="number" min={1} value={form.personas} onChange={(e) => setForm({ ...form, personas: e.target.value })} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sm">Monto límite de aprobación (S/)</Label>
                <Input id="sm" type="number" min={0} value={form.montoLimiteAprobacion} disabled={!!form.id && !esAprobador} onChange={(e) => setForm({ ...form, montoLimiteAprobacion: e.target.value })} />
                {!!form.id && !esAprobador && <p className="text-xs text-muted-foreground">Solo el aprobador puede cambiar el monto límite.</p>}
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
    </>
  );
}
