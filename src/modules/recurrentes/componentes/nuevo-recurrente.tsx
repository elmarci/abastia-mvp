"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectNativo } from "@/components/ui/select-nativo";
import { crearRecurrenteDesdePedido } from "@/modules/recurrentes/acciones";

export function NuevoRecurrente({ pedidos }: { pedidos: { id: string; etiqueta: string }[] }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [pedidoId, setPedidoId] = useState(pedidos[0]?.id ?? "");
  const [nombre, setNombre] = useState("");
  const [frecuencia, setFrecuencia] = useState<"SEMANAL" | "QUINCENAL" | "MENSUAL">("SEMANAL");
  return (
    <Card>
      <CardContent className="grid gap-3 p-5 sm:grid-cols-[1fr_1fr_160px_auto] sm:items-end">
        <div className="space-y-1">
          <Label htmlFor="rec-pedido" className="text-xs text-muted-foreground">
            A partir del pedido
          </Label>
          <SelectNativo id="rec-pedido" value={pedidoId} onChange={(e) => setPedidoId(e.target.value)}>
            {pedidos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </SelectNativo>
        </div>
        <div className="space-y-1">
          <Label htmlFor="rec-nombre" className="text-xs text-muted-foreground">
            Nombre
          </Label>
          <Input id="rec-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Abarrotes semanales" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="rec-frec" className="text-xs text-muted-foreground">
            Frecuencia
          </Label>
          <SelectNativo id="rec-frec" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as typeof frecuencia)}>
            <option value="SEMANAL">Semanal</option>
            <option value="QUINCENAL">Quincenal</option>
            <option value="MENSUAL">Mensual</option>
          </SelectNativo>
        </div>
        <Button
          disabled={pendiente || !pedidoId}
          onClick={() =>
            iniciar(async () => {
              const r = await crearRecurrenteDesdePedido({ pedidoId, nombre, frecuencia });
              if (r.ok) {
                toast.success(r.mensaje);
                setNombre("");
                router.refresh();
              } else toast.error(r.error);
            })
          }
        >
          {pendiente ? <Loader2 className="animate-spin" /> : <Plus />} Crear
        </Button>
      </CardContent>
    </Card>
  );
}
