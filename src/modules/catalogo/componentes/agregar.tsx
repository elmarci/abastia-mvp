"use client";
import { useState, useTransition } from "react";
import { Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { agregarAlCarrito } from "@/modules/pedidos/acciones-carrito";
import { cn } from "@/lib/utils";

/** Selector de cantidad + botón "Agregar al pedido". */
export function AgregarAlPedido({ ofertaId, minimo = 1, className, compacto }: { ofertaId: string; minimo?: number; className?: string; compacto?: boolean }) {
  const [cantidad, setCantidad] = useState(Math.max(1, minimo));
  const [pendiente, iniciar] = useTransition();
  const router = useRouter();

  function agregar() {
    iniciar(async () => {
      const r = await agregarAlCarrito({ ofertaId, cantidad });
      if (r.ok) {
        toast.success(r.mensaje, { action: { label: "Ver pedido", onClick: () => router.push("/comprador/carrito") } });
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex h-10 items-center rounded-xl border border-input bg-background">
        <button type="button" className="flex h-full w-9 items-center justify-center rounded-l-xl hover:bg-muted disabled:opacity-40" onClick={() => setCantidad((c) => Math.max(1, c - 1))} disabled={cantidad <= 1} aria-label="Disminuir cantidad">
          <Minus className="size-3.5" />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={cantidad}
          onChange={(e) => setCantidad(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          className="h-full w-12 bg-transparent text-center text-sm outline-none cifra [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
          aria-label="Cantidad"
          data-testid="cantidad"
        />
        <button type="button" className="flex h-full w-9 items-center justify-center rounded-r-xl hover:bg-muted" onClick={() => setCantidad((c) => c + 1)} aria-label="Aumentar cantidad">
          <Plus className="size-3.5" />
        </button>
      </div>
      <Button onClick={agregar} disabled={pendiente} className="flex-1" data-testid="agregar-pedido">
        {pendiente ? <Loader2 className="animate-spin" /> : <ShoppingCart />}
        {compacto ? "Agregar" : "Agregar al pedido"}
      </Button>
    </div>
  );
}
