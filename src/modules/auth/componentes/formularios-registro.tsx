"use client";
import { useTransition } from "react";
import { useForm, type FieldErrors, type UseFormRegister, type FieldValues, type Path } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DISTRITOS_LIMA } from "@/lib/negocio/validadores";
import { CATEGORIAS_PROVEEDOR, esquemaRegistroConsumidor, esquemaRegistroEmpresa, esquemaRegistroProveedor, TIPOS_ORGANIZACION } from "@/modules/auth/esquemas";
import { registrarConsumidor, registrarEmpresa, registrarProveedor } from "@/modules/auth/acciones-registro";

const claseSelect = "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Campo<T extends FieldValues>({ nombre, etiqueta, register, errores, tipo = "text", ayuda, ...resto }: { nombre: Path<T>; etiqueta: string; register: UseFormRegister<T>; errores: FieldErrors<T>; tipo?: string; ayuda?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const error = errores[nombre]?.message as string | undefined;
  return (
    <div className="space-y-2">
      <Label htmlFor={nombre}>{etiqueta}</Label>
      <Input id={nombre} type={tipo} aria-invalid={!!error} {...register(nombre)} {...resto} />
      {error ? <p className="text-xs text-destructive">{error}</p> : ayuda && <p className="text-xs text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

function Distritos({ id, etiqueta, ...props }: { id: string; etiqueta: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{etiqueta}</Label>
      <select id={id} className={claseSelect} {...props}>
        {DISTRITOS_LIMA.map((d) => (
          <option key={d}>{d}</option>
        ))}
      </select>
    </div>
  );
}

export function FormulariosRegistro({ inicial }: { inicial: "empresa" | "proveedor" | "consumidor" }) {
  return (
    <Tabs defaultValue={inicial} className="mt-6">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="empresa" className="flex-1">Empresa compradora</TabsTrigger>
        <TabsTrigger value="proveedor" className="flex-1">Proveedor</TabsTrigger>
        <TabsTrigger value="consumidor" className="flex-1">Consumidor</TabsTrigger>
      </TabsList>
      <TabsContent value="empresa">
        <RegistroEmpresa />
      </TabsContent>
      <TabsContent value="proveedor">
        <RegistroProveedor />
      </TabsContent>
      <TabsContent value="consumidor">
        <RegistroConsumidor />
      </TabsContent>
    </Tabs>
  );
}

function RegistroEmpresa() {
  const [pendiente, iniciar] = useTransition();
  type D = z.input<typeof esquemaRegistroEmpresa>;
  const { register, handleSubmit, formState } = useForm<D>({
    resolver: zodResolver(esquemaRegistroEmpresa),
    defaultValues: { tipo: "OFICINA", distrito: "San Isidro", sedeDistrito: "San Isidro", personas: 100, montoLimite: 3000, minutosCompraBase: 120 },
  });
  const e = formState.errors;
  return (
    <Card>
      <CardContent className="p-6">
        <form
          noValidate
          onSubmit={handleSubmit((d) =>
            iniciar(async () => {
              const r = await registrarEmpresa(d);
              if (r && !r.ok) toast.error(r.error);
            }),
          )}
          className="space-y-6"
        >
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">Datos de la empresa</legend>
            <Campo<D> nombre="ruc" etiqueta="RUC" register={register} errores={e} inputMode="numeric" maxLength={11} ayuda="11 dígitos; validamos el dígito verificador" />
            <Campo<D> nombre="razonSocial" etiqueta="Razón social" register={register} errores={e} />
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de organización</Label>
              <select id="tipo" className={claseSelect} {...register("tipo")}>
                {TIPOS_ORGANIZACION.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Distritos id="distrito" etiqueta="Distrito" {...register("distrito")} />
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">Primera sede</legend>
            <Campo<D> nombre="sedeNombre" etiqueta="Nombre de la sede" register={register} errores={e} placeholder="Sede principal" />
            <Campo<D> nombre="sedeDireccion" etiqueta="Dirección" register={register} errores={e} />
            <Distritos id="sedeDistrito" etiqueta="Distrito de Lima" {...register("sedeDistrito")} />
            <Campo<D> nombre="personas" etiqueta="Personas atendidas" tipo="number" register={register} errores={e} />
            <Campo<D> nombre="montoLimite" etiqueta="Monto límite de aprobación (S/)" tipo="number" register={register} errores={e} ayuda="Los pedidos que lo superen requieren aprobación" />
            <Campo<D> nombre="minutosCompraBase" etiqueta="¿Cuántos minutos te toma hoy armar un pedido?" tipo="number" register={register} errores={e} ayuda="Línea base para medir tu ahorro de tiempo" />
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-sm font-semibold">Tu usuario</legend>
            <Campo<D> nombre="nombre" etiqueta="Nombre y apellido" register={register} errores={e} autoComplete="name" />
            <Campo<D> nombre="email" etiqueta="Correo" tipo="email" register={register} errores={e} autoComplete="email" />
            <Campo<D> nombre="password" etiqueta="Contraseña" tipo="password" register={register} errores={e} autoComplete="new-password" ayuda="Mínimo 8 caracteres, una mayúscula y un número" />
          </fieldset>
          <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Crear cuenta de empresa
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegistroProveedor() {
  const [pendiente, iniciar] = useTransition();
  type D = z.input<typeof esquemaRegistroProveedor>;
  const { register, handleSubmit, formState } = useForm<D>({ resolver: zodResolver(esquemaRegistroProveedor), defaultValues: { tipo: "Distribuidor", categorias: [], zonaReparto: "Lima Moderna" } });
  const e = formState.errors;
  return (
    <Card>
      <CardContent className="p-6">
        <form
          noValidate
          onSubmit={handleSubmit((d) =>
            iniciar(async () => {
              const r = await registrarProveedor(d);
              if (r && !r.ok) toast.error(r.error);
            }),
          )}
          className="space-y-6"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo<D> nombre="ruc" etiqueta="RUC" register={register} errores={e} inputMode="numeric" maxLength={11} />
            <Campo<D> nombre="razonSocial" etiqueta="Razón social" register={register} errores={e} />
            <div className="space-y-2">
              <Label htmlFor="ptipo">Tipo</Label>
              <select id="ptipo" className={claseSelect} {...register("tipo")}>
                {["Productor", "Cooperativa", "Fabricante", "Mayorista", "Distribuidor"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <Campo<D> nombre="zonaReparto" etiqueta="Zona de reparto" register={register} errores={e} ayuda="Separa con comas: Lima Moderna, Lima Norte" />
          </div>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Categorías que vendes</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CATEGORIAS_PROVEEDOR.map((c) => (
                <label key={c} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-secondary/60">
                  <input type="checkbox" value={c} {...register("categorias")} className="accent-[var(--primary)]" /> {c}
                </label>
              ))}
            </div>
            {e.categorias && <p className="mt-1 text-xs text-destructive">{e.categorias.message}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo<D> nombre="nombre" etiqueta="Nombre del contacto" register={register} errores={e} />
            <Campo<D> nombre="telefono" etiqueta="Celular" register={register} errores={e} inputMode="tel" />
            <Campo<D> nombre="email" etiqueta="Correo" tipo="email" register={register} errores={e} />
            <Campo<D> nombre="password" etiqueta="Contraseña" tipo="password" register={register} errores={e} />
          </div>
          <p className="rounded-xl bg-muted p-3 text-sm text-muted-foreground">Tu cuenta quedará <strong>pendiente de homologación</strong>. El equipo de AbastIA revisará tus documentos antes de publicar tus ofertas.</p>
          <Button type="submit" size="lg" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Registrar mi negocio
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function RegistroConsumidor() {
  const [pendiente, iniciar] = useTransition();
  type D = z.input<typeof esquemaRegistroConsumidor>;
  const { register, handleSubmit, formState } = useForm<D>({ resolver: zodResolver(esquemaRegistroConsumidor), defaultValues: { distrito: "Miraflores" } });
  const e = formState.errors;
  return (
    <Card>
      <CardContent className="p-6">
        <form
          noValidate
          onSubmit={handleSubmit((d) =>
            iniciar(async () => {
              const r = await registrarConsumidor(d);
              if (r && !r.ok) toast.error(r.error);
            }),
          )}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Campo<D> nombre="nombre" etiqueta="Nombre y apellido" register={register} errores={e} />
          <Campo<D> nombre="telefono" etiqueta="Celular" register={register} errores={e} />
          <Campo<D> nombre="direccion" etiqueta="Dirección de entrega" register={register} errores={e} />
          <Distritos id="cdistrito" etiqueta="Distrito" {...register("distrito")} />
          <Campo<D> nombre="email" etiqueta="Correo" tipo="email" register={register} errores={e} />
          <Campo<D> nombre="password" etiqueta="Contraseña" tipo="password" register={register} errores={e} />
          <Button type="submit" size="lg" className="sm:col-span-2" disabled={pendiente}>
            {pendiente && <Loader2 className="animate-spin" />} Crear cuenta y comprar
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
