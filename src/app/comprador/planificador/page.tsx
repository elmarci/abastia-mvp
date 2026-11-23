import type { Metadata } from "next";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { sedesYActual } from "@/lib/sede";
import { PRECIO_PLAN_PRO } from "@/lib/negocio";
import { datosPlanificador } from "@/modules/planificador/consultas";
import { Planificador } from "@/modules/planificador/componentes/planificador";

export const metadata: Metadata = { title: "Planificador con IA" };

export default async function PaginaPlanificador() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: usuario.empresaId! } });
  const { actual } = await sedesYActual(empresa.id);

  if (empresa.plan === "BASICO") {
    return (
      <>
        <Encabezado titulo="Planificador de compras con IA" />
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-8 shadow-sm sm:p-12">
          <div className="pointer-events-none absolute inset-0 select-none opacity-40 blur-[3px]" aria-hidden>
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted" />
              ))}
            </div>
          </div>
          <div className="relative mx-auto max-w-lg text-center" data-testid="planificador-bloqueado">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <Lock className="size-6" />
            </span>
            <h2 className="mt-5 text-2xl font-semibold tracking-tight">Compra la cantidad justa con el plan Pro</h2>
            <p className="mt-2 text-muted-foreground">
              El planificador pronostica tu consumo de la semana según tus personas atendidas y tu historial, y te sugiere cuánto comprar para no quedarte sin stock ni desperdiciar.
            </p>
            <ul className="mx-auto mt-5 max-w-sm space-y-1.5 text-left text-sm">
              {["Sugerencias con explicación en lenguaje natural", "Alertas de stock bajo y de precio", "Panel de gasto por sede y aprobaciones"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Sparkles className="size-4 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <Button size="lg" className="mt-6" asChild>
              <Link href="/#planes">Pasar a Pro · S/ {PRECIO_PLAN_PRO} por sede al mes</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const datos = actual ? await datosPlanificador(actual.id) : null;
  return (
    <>
      <Encabezado
        titulo="Planificador de compras con IA"
        descripcion="Pronóstico con promedio móvil ponderado de las últimas 4 semanas (pesos 0.1, 0.2, 0.3 y 0.4) más 10 % de stock de seguridad."
      />
      {!datos || datos.filas.length === 0 ? (
        <EstadoVacio icono={<Sparkles className="size-7" />} titulo="Aún no hay historial de consumo" descripcion="Cuando registres tus primeros pedidos, el planificador empezará a sugerirte cantidades." />
      ) : (
        <Planificador key={datos.sede.id} sede={datos.sede} filas={datos.filas} />
      )}
    </>
  );
}
