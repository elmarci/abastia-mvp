"use client";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Briefcase, Building, Crown, Loader2, ShieldCheck, ShoppingBasket, Stethoscope, Store, Truck } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { esquemaLogin } from "@/modules/auth/esquemas";
import { iniciarSesion } from "@/modules/auth/acciones";

const DEMOS = [
  { rol: "Comprador", detalle: "Oficinas Andina", email: "compras@andina.pe", icono: Briefcase },
  { rol: "Aprobador", detalle: "Gerencia Andina", email: "gerencia@andina.pe", icono: Crown },
  { rol: "Proveedor", detalle: "Distribuidora Lima Norte", email: "ventas@limanorte.pe", icono: Truck },
  { rol: "Administrador", detalle: "Equipo AbastIA", email: "admin@abastia.pe", icono: ShieldCheck },
];
const DEMOS_AMPLIADOS = [
  { rol: "Institución", detalle: "Clínica San Gabriel", email: "compras@clinicasangabriel.pe", icono: Stethoscope },
  { rol: "Mayorista", detalle: "Bodega Doña Rosa", email: "rosa@bodegarosa.pe", icono: Store },
  { rol: "Consumidor", detalle: "Tienda retail", email: "cliente@correo.pe", icono: ShoppingBasket },
];
const CONTRASENA_DEMO = "Demo2026!";

export function FormularioLogin() {
  const params = useSearchParams();
  const destino = params.get("callbackUrl") ?? params.get("next") ?? undefined;
  const [pendiente, iniciar] = useTransition();
  const [demoActiva, setDemoActiva] = useState<string | null>(null);
  const form = useForm<z.infer<typeof esquemaLogin>>({ resolver: zodResolver(esquemaLogin), defaultValues: { email: "", password: "" } });

  function entrar(valores: z.infer<typeof esquemaLogin>, demo?: string) {
    setDemoActiva(demo ?? null);
    iniciar(async () => {
      let ruta = destino;
      try {
        ruta = destino ? new URL(destino, window.location.origin).pathname : undefined;
      } catch {
        ruta = undefined;
      }
      const r = await iniciarSesion(valores, ruta);
      if (r && !r.ok) {
        toast.error(r.error);
        setDemoActiva(null);
      }
    });
  }

  return (
    <div className="mt-8">
      <form onSubmit={form.handleSubmit((v) => entrar(v))} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" type="email" autoComplete="email" placeholder="compras@tuempresa.pe" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
          {form.formState.errors.email && <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!form.formState.errors.password} {...form.register("password")} />
          {form.formState.errors.password && <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full" size="lg" disabled={pendiente}>
          {pendiente && !demoActiva && <Loader2 className="animate-spin" />} Ingresar
        </Button>
      </form>

      <div className="my-8 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Entrar como demo</span>
        <Separator className="flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        {DEMOS.map((d) => (
          <BotonDemo key={d.email} demo={d} cargando={pendiente && demoActiva === d.email} deshabilitado={pendiente} onClick={() => entrar({ email: d.email, password: CONTRASENA_DEMO }, d.email)} />
        ))}
      </div>
      <p className="mb-2 mt-5 text-xs text-muted-foreground">Alcance ampliado</p>
      <div className="grid grid-cols-3 gap-2">
        {DEMOS_AMPLIADOS.map((d) => (
          <BotonDemo key={d.email} compacto demo={d} cargando={pendiente && demoActiva === d.email} deshabilitado={pendiente} onClick={() => entrar({ email: d.email, password: CONTRASENA_DEMO }, d.email)} />
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Contraseña de todas las cuentas demo: <code className="rounded bg-muted px-1.5 py-0.5">{CONTRASENA_DEMO}</code>
      </p>
    </div>
  );
}

function BotonDemo({ demo, cargando, deshabilitado, onClick, compacto }: { demo: { rol: string; detalle: string; email: string; icono: typeof Building }; cargando: boolean; deshabilitado: boolean; onClick: () => void; compacto?: boolean }) {
  const Icono = demo.icono;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={deshabilitado}
      data-testid={`demo-${demo.email}`}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
        {cargando ? <Loader2 className="size-4 animate-spin" /> : <Icono className="size-4" />}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium">{demo.rol}</span>
        {!compacto && <span className="block truncate text-xs text-muted-foreground">{demo.detalle}</span>}
      </span>
    </button>
  );
}
