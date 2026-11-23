"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarComision, homologarProveedor, suspenderProveedor } from "@/modules/admin/acciones";

export function AccionesProveedor({ id, estado, comision }: { id: string; estado: string; comision: number }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [pct, setPct] = useState((comision * 100).toFixed(1));

  function correr(fn: () => Promise<{ ok: boolean; mensaje?: string; error?: string }>) {
    iniciar(async () => {
      const r = await fn();
      if (r.ok) toast.success(r.mensaje);
      else toast.error(r.error);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label htmlFor={`com-${id}`} className="text-xs text-muted-foreground">
          Comisión %
        </Label>
        <div className="flex gap-1.5">
          <Input id={`com-${id}`} type="number" step="0.5" min={5} max={8} value={pct} onChange={(e) => setPct(e.target.value)} className="h-9 w-20 cifra" />
          <Button size="sm" variant="outline" className="h-9" disabled={pendiente || Number(pct) === Math.round(comision * 1000) / 10} onClick={() => correr(() => cambiarComision({ id, porcentaje: Number(pct) }))}>
            Guardar
          </Button>
        </div>
      </div>
      {estado !== "HOMOLOGADO" ? (
        <Button size="sm" className="h-9" disabled={pendiente} onClick={() => correr(() => homologarProveedor(id))} data-testid="homologar">
          {pendiente ? <Loader2 className="animate-spin" /> : <BadgeCheck />} Homologar
        </Button>
      ) : (
        <Button size="sm" variant="ghost" className="h-9 text-destructive" disabled={pendiente} onClick={() => correr(() => suspenderProveedor(id))}>
          <Ban /> Suspender
        </Button>
      )}
    </div>
  );
}
