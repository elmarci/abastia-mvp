"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { esquemaLead } from "@/modules/landing/esquemas";
import { solicitarPiloto } from "@/modules/landing/acciones";

type Datos = z.input<typeof esquemaLead>;
const TIPOS = ["Oficina", "Restaurante", "Hotel", "Hospital o clínica", "Colegio", "Proyecto o campamento", "Bodega o minimarket", "Otro"];

export function FormularioPiloto() {
  const [pendiente, iniciar] = useTransition();
  const [enviado, setEnviado] = useState(false);
  const form = useForm<Datos>({ resolver: zodResolver(esquemaLead), defaultValues: { nombre: "", empresa: "", email: "", telefono: "", tipo: "Oficina", mensaje: "" } });
  const e = form.formState.errors;

  function enviar(d: Datos) {
    iniciar(async () => {
      const r = await solicitarPiloto(d);
      if (r.ok) {
        setEnviado(true);
        toast.success(r.mensaje);
      } else toast.error(r.error);
    });
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center rounded-3xl border border-border bg-card p-10 text-center shadow-sm" data-testid="piloto-enviado">
        <CheckCircle2 className="size-12 text-primary" />
        <p className="mt-4 text-xl font-semibold">¡Solicitud recibida!</p>
        <p className="mt-1 text-muted-foreground">Te contactaremos en menos de 24 horas para activar tu piloto gratuito de 30 días.</p>
      </div>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(enviar)} className="grid grid-cols-1 gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:grid-cols-2 sm:p-8" noValidate>
      <Campo id="nombre" etiqueta="Nombre y apellido" error={e.nombre?.message}>
        <Input id="nombre" autoComplete="name" {...form.register("nombre")} aria-invalid={!!e.nombre} />
      </Campo>
      <Campo id="empresa" etiqueta="Organización" error={e.empresa?.message}>
        <Input id="empresa" autoComplete="organization" {...form.register("empresa")} aria-invalid={!!e.empresa} />
      </Campo>
      <Campo id="lemail" etiqueta="Correo" error={e.email?.message}>
        <Input id="lemail" type="email" autoComplete="email" {...form.register("email")} aria-invalid={!!e.email} />
      </Campo>
      <Campo id="telefono" etiqueta="Celular (opcional)" error={e.telefono?.message}>
        <Input id="telefono" inputMode="tel" placeholder="987654321" {...form.register("telefono")} aria-invalid={!!e.telefono} />
      </Campo>
      <Campo id="tipo" etiqueta="Tipo de organización" error={e.tipo?.message}>
        <select id="tipo" {...form.register("tipo")} className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {TIPOS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </Campo>
      <Campo id="lpersonas" etiqueta="Personas atendidas" error={e.personas?.message}>
        <Input id="lpersonas" type="number" min={1} {...form.register("personas")} aria-invalid={!!e.personas} />
      </Campo>
      <div className="sm:col-span-2">
        <Campo id="mensaje" etiqueta="¿Qué te gustaría resolver? (opcional)">
          <Textarea id="mensaje" {...form.register("mensaje")} />
        </Campo>
      </div>
      <Button type="submit" size="lg" className="sm:col-span-2" disabled={pendiente} data-testid="enviar-piloto">
        {pendiente && <Loader2 className="animate-spin" />} Solicita tu piloto gratuito de 30 días
      </Button>
    </form>
  );
}

function Campo({ id, etiqueta, error, children }: { id: string; etiqueta: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
