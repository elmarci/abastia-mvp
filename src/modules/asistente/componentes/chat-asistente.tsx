"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Check, Loader2, Send, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fechaSolo, soles } from "@/lib/formato";
import { cn } from "@/lib/utils";
import { confirmarPropuesta, preguntarAsistente, type Propuesta } from "@/modules/asistente/acciones";

type Mensaje = { id: string; autor: "USUARIO" | "ASISTENTE"; contenido: string; propuesta?: Propuesta };

const EJEMPLOS = ["20 kg de arroz y 10 bidones para San Isidro el jueves", "3 cajas de aceite, 5 bolsas de café y papel toalla", "2 sacos de azúcar para mañana"];

export function ChatAsistente({ historial, conClaude }: { historial: Mensaje[]; conClaude: boolean }) {
  const router = useRouter();
  const [mensajes, setMensajes] = useState<Mensaje[]>(historial);
  const [texto, setTexto] = useState("");
  const [pendiente, iniciar] = useTransition();
  const [confirmada, setConfirmada] = useState<string | null>(null);
  const fin = useRef<HTMLDivElement>(null);
  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  function enviar(valor: string) {
    const limpio = valor.trim();
    if (!limpio) return;
    setTexto("");
    setMensajes((m) => [...m, { id: `u-${Date.now()}`, autor: "USUARIO", contenido: limpio }]);
    iniciar(async () => {
      const r = await preguntarAsistente(limpio);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setMensajes((m) => [...m, { id: `a-${Date.now()}`, autor: "ASISTENTE", contenido: r.datos!.respuesta, propuesta: r.datos! }]);
    });
  }

  function confirmar(id: string, p: Propuesta) {
    iniciar(async () => {
      const r = await confirmarPropuesta({ items: p.items.map((i) => ({ ofertaId: i.ofertaId, cantidad: i.cantidad })), sedeId: p.sede?.id ?? null, fecha: p.fecha });
      if (r.ok) {
        setConfirmada(id);
        toast.success(r.mensaje);
        router.push(r.datos!.url);
      } else toast.error(r.error);
    });
  }

  return (
    <Card className="flex h-[calc(100dvh-14rem)] min-h-[420px] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6" data-testid="chat">
        {mensajes.length === 0 && (
          <div className="mx-auto max-w-md space-y-3 py-8 text-center">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
              <Sparkles className="size-6" />
            </span>
            <p className="font-medium">Escribe lo que necesitas, como se lo dirías a tu proveedor.</p>
            <div className="flex flex-col gap-2">
              {EJEMPLOS.map((e) => (
                <button key={e} onClick={() => enviar(e)} className="rounded-xl border border-border px-3 py-2 text-left text-sm hover:bg-muted">
                  «{e}»
                </button>
              ))}
            </div>
          </div>
        )}
        {mensajes.map((m) => (
          <div key={m.id} className={cn("flex gap-2", m.autor === "USUARIO" && "flex-row-reverse")}>
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", m.autor === "USUARIO" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")}>
              {m.autor === "USUARIO" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div className={cn("max-w-[85%] space-y-2 rounded-2xl px-4 py-2.5 text-sm", m.autor === "USUARIO" ? "bg-primary text-primary-foreground" : "bg-muted")}>
              <p>{m.contenido}</p>
              {m.propuesta && m.propuesta.items.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border bg-background p-3 text-foreground" data-testid="propuesta-asistente">
                  <ul className="space-y-1.5">
                    {m.propuesta.items.map((i) => (
                      <li key={i.ofertaId} className="flex items-start justify-between gap-3">
                        <span>
                          {i.emoji} {i.cantidad} {i.unidadPlural} · {i.producto}
                          <span className="block text-xs text-muted-foreground">
                            {i.proveedor}
                            {i.nota ? ` · ${i.nota}` : ""}
                          </span>
                        </span>
                        <span className="cifra">{soles(i.precio * i.cantidad)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {m.propuesta.sede && <Badge variant="info">{m.propuesta.sede.nombre}</Badge>}
                    {m.propuesta.fecha && <Badge variant="info">Entrega {fechaSolo(m.propuesta.fecha)}</Badge>}
                    <Badge variant="secondary">{m.propuesta.motor === "claude" ? "Interpretado con Claude" : "Interpretado con reglas"}</Badge>
                  </div>
                  {m.propuesta.noEntendidos.length > 0 && <p className="text-xs text-muted-foreground">No entendí: {m.propuesta.noEntendidos.join(", ")}</p>}
                  <Button size="sm" className="w-full" disabled={pendiente || confirmada === m.id} onClick={() => confirmar(m.id, m.propuesta!)} data-testid="confirmar-propuesta">
                    {confirmada === m.id ? <Check /> : null} Confirmar y agregar al pedido
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {pendiente && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Pensando…
          </p>
        )}
        <div ref={fin} />
      </div>
      <CardContent className="border-t border-border p-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ej.: 20 kg de arroz y 10 bidones para San Isidro el jueves" aria-label="Mensaje para el asistente" maxLength={500} data-testid="mensaje-asistente" />
          <Button type="submit" size="icon" disabled={pendiente || !texto.trim()} aria-label="Enviar">
            <Send />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">{conClaude ? "Usa la API de Claude." : "Funciona con reglas simples (sin clave de API)."} Nunca confirma un pedido sin que pulses «Confirmar».</p>
      </CardContent>
    </Card>
  );
}
