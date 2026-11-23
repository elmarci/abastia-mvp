"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Loader2, Repeat, Star, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { aprobarPedido, cancelarPedido, confirmarRecepcion, rechazarPedido, repetirPedido } from "@/modules/pedidos/acciones";
import { cn } from "@/lib/utils";

export function BotonesAprobacion({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [motivo, setMotivo] = useState("");
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          iniciar(async () => {
            const r = await aprobarPedido(pedidoId);
            if (r.ok) toast.success(r.mensaje);
            else toast.error(r.error);
            router.refresh();
          })
        }
        disabled={pendiente}
        data-testid="aprobar-pedido"
      >
        {pendiente ? <Loader2 className="animate-spin" /> : <Check />} Aprobar
      </Button>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button variant="outline" disabled={pendiente}>
            <X /> Rechazar
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar pedido</DialogTitle>
            <DialogDescription>El comprador verá el motivo y el pedido no llegará a los proveedores.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo</Label>
            <Textarea id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: excede el presupuesto de este mes" />
          </div>
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={pendiente || motivo.trim().length < 5}
              onClick={() =>
                iniciar(async () => {
                  const r = await rechazarPedido({ id: pedidoId, motivo });
                  if (r.ok) {
                    toast.success(r.mensaje);
                    setAbierto(false);
                  } else toast.error(r.error);
                  router.refresh();
                })
              }
            >
              Rechazar pedido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BotonRepetir({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pendiente}
      data-testid="repetir-pedido"
      onClick={() =>
        iniciar(async () => {
          const r = await repetirPedido(pedidoId);
          if (r.ok) {
            toast.success(`Pedido repetido: ${r.datos?.agregados} productos con precios vigentes${r.datos?.omitidos ? ` (${r.datos.omitidos} sin stock)` : ""}`);
            router.push("/comprador/carrito");
          } else toast.error(r.error);
        })
      }
    >
      {pendiente ? <Loader2 className="animate-spin" /> : <Repeat />} Repetir pedido
    </Button>
  );
}

export function BotonCancelar({ pedidoId }: { pedidoId: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      variant="ghost"
      className="text-destructive"
      disabled={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await cancelarPedido(pedidoId);
          if (r.ok) toast.success(r.mensaje);
          else toast.error(r.error);
          router.refresh();
        })
      }
    >
      <Ban /> Cancelar pedido
    </Button>
  );
}

const TIPOS = ["Producto faltante", "Producto dañado", "Fuera de fecha", "Otro"] as const;

export function FormularioRecepcion({ subPedidoId, proveedor, conTemperatura }: { subPedidoId: string; proveedor: string; conTemperatura?: boolean }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [conforme, setConforme] = useState(true);
  const [estrellas, setEstrellas] = useState(5);
  const [tipo, setTipo] = useState<(typeof TIPOS)[number]>("Producto faltante");
  const [observacion, setObservacion] = useState("");
  const [temperatura, setTemperatura] = useState("");

  function enviar() {
    iniciar(async () => {
      const r = await confirmarRecepcion({
        subPedidoId,
        conforme,
        calificacion: estrellas,
        tipoObservacion: conforme ? undefined : tipo,
        observacion: conforme ? undefined : observacion,
        temperatura: temperatura ? Number(temperatura) : undefined,
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
        <Button size="sm" data-testid="confirmar-recepcion">
          <Check /> Confirmar recepción
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recepción de {proveedor}</DialogTitle>
          <DialogDescription>Confirma que recibiste todo conforme o registra una observación.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Resultado de la recepción">
          {[
            [true, "Todo conforme"],
            [false, "Con observación"],
          ].map(([v, t]) => (
            <button
              key={String(v)}
              role="radio"
              aria-checked={conforme === v}
              onClick={() => setConforme(v as boolean)}
              className={cn("rounded-xl border border-border p-3 text-sm font-medium transition-colors hover:bg-muted", conforme === v && "border-primary bg-secondary/60")}
            >
              {t as string}
            </button>
          ))}
        </div>
        {!conforme && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {TIPOS.map((t) => (
                <button key={t} onClick={() => setTipo(t)} className={cn("rounded-full border border-border px-3 py-1 text-xs", tipo === t && "border-primary bg-primary text-primary-foreground")}>
                  {t}
                </button>
              ))}
            </div>
            <Textarea value={observacion} onChange={(e) => setObservacion(e.target.value)} placeholder="Describe lo que pasó" aria-label="Observación" />
          </div>
        )}
        {conTemperatura && (
          <div className="space-y-2">
            <Label htmlFor="temp">Temperatura al recibir (°C, opcional)</Label>
            <Input id="temp" type="number" step="0.1" value={temperatura} onChange={(e) => setTemperatura(e.target.value)} placeholder="Ej.: 4.0" />
          </div>
        )}
        <div className="space-y-2">
          <Label>Califica al proveedor</Label>
          <div className="flex gap-1" role="radiogroup" aria-label="Calificación">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} role="radio" aria-checked={estrellas === n} aria-label={`${n} estrellas`} onClick={() => setEstrellas(n)} className="rounded p-1 transition-transform hover:scale-110" data-testid={`estrella-${n}`}>
                <Star className={cn("size-7", n <= estrellas ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
              </button>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={enviar} disabled={pendiente} data-testid="enviar-recepcion">
            {pendiente && <Loader2 className="animate-spin" />} Registrar recepción
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
