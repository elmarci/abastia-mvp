"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ETIQUETAS_ESTADO, siguienteEstado, type EstadoSubPedido } from "@/lib/negocio";
import { avanzarSubpedido, rechazarSubpedido } from "@/modules/proveedor/acciones";

export function AccionesSubpedido({ id, estado, compacto }: { id: string; estado: string; compacto?: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [motivo, setMotivo] = useState("");
  const [abierto, setAbierto] = useState(false);
  const siguiente = siguienteEstado(estado as EstadoSubPedido);
  const puedeRechazar = estado === "RECIBIDO" || estado === "CONFIRMADO";
  if (!siguiente && !puedeRechazar) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {siguiente && (
        <Button
          size="sm"
          disabled={pendiente}
          data-testid="avanzar-estado"
          onClick={() =>
            iniciar(async () => {
              const r = await avanzarSubpedido(id);
              if (r.ok) toast.success(`Estado: ${ETIQUETAS_ESTADO[r.datos!.estado as EstadoSubPedido]}`);
              else toast.error(r.error);
              router.refresh();
            })
          }
        >
          {pendiente ? <Loader2 className="animate-spin" /> : <ArrowRight />}
          {compacto ? ETIQUETAS_ESTADO[siguiente].split(" ")[0] : `Marcar "${ETIQUETAS_ESTADO[siguiente]}"`}
        </Button>
      )}
      {puedeRechazar && (
        <Dialog open={abierto} onOpenChange={setAbierto}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="text-destructive" disabled={pendiente}>
              <X /> Rechazar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rechazar subpedido</DialogTitle>
              <DialogDescription>El comprador verá el motivo. El stock reservado vuelve a tu catálogo.</DialogDescription>
            </DialogHeader>
            <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: sin stock para la fecha solicitada" aria-label="Motivo del rechazo" />
            <DialogFooter>
              <Button
                variant="destructive"
                disabled={pendiente || motivo.trim().length < 5}
                onClick={() =>
                  iniciar(async () => {
                    const r = await rechazarSubpedido({ id, motivo });
                    if (r.ok) {
                      toast.success(r.mensaje);
                      setAbierto(false);
                    } else toast.error(r.error);
                    router.refresh();
                  })
                }
              >
                Rechazar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
