"use client";
import { useState } from "react";
import { Clock, PiggyBank } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AHORRO_OBJETIVO } from "@/lib/negocio/constantes";
import { soles } from "@/lib/formato";

/**
 * Calculadora de ahorro: ahorro estimado del 8 % sobre el gasto y horas ahorradas.
 * Horas actuales estimadas al mes = (4 h + 1 h por cada 50 personas) por semana × 4.33;
 * AbastIA reduce ese tiempo a la mitad (meta H5).
 */
export function horasAhorradas(personas: number) {
  const horasSemana = 4 + Math.max(0, personas) / 50;
  return Math.round(horasSemana * 4.33 * 0.5);
}

export function Calculadora() {
  const [personas, setPersonas] = useState(120);
  const [gasto, setGasto] = useState(12000);
  const ahorroMes = Math.max(0, gasto) * AHORRO_OBJETIVO;
  return (
    <div className="grid gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8 lg:grid-cols-2" data-testid="calculadora">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="calc-personas">Personas que atiendes</Label>
          <Input id="calc-personas" type="number" min={1} value={personas} onChange={(e) => setPersonas(Number(e.target.value) || 0)} className="h-12 text-lg cifra" data-testid="calc-personas" />
          <input type="range" min={10} max={1000} step={10} value={personas} onChange={(e) => setPersonas(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Personas (deslizador)" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="calc-gasto">Gasto mensual aproximado en insumos (S/)</Label>
          <Input id="calc-gasto" type="number" min={0} step={500} value={gasto} onChange={(e) => setGasto(Number(e.target.value) || 0)} className="h-12 text-lg cifra" data-testid="calc-gasto" />
          <input type="range" min={1000} max={150000} step={500} value={gasto} onChange={(e) => setGasto(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Gasto mensual (deslizador)" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1" aria-live="polite">
        <div className="rounded-2xl bg-accent/15 p-5">
          <p className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
            <PiggyBank className="size-4" /> Ahorro estimado (8 %)
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight cifra" data-testid="calc-ahorro">
            {soles(ahorroMes)} <span className="text-base font-normal text-muted-foreground">al mes</span>
          </p>
          <p className="text-sm text-muted-foreground cifra">{soles(ahorroMes * 12)} al año</p>
        </div>
        <div className="rounded-2xl bg-secondary p-5">
          <p className="flex items-center gap-2 text-sm text-secondary-foreground">
            <Clock className="size-4" /> Horas que recuperas
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight cifra" data-testid="calc-horas">
            {horasAhorradas(personas)} h <span className="text-base font-normal text-muted-foreground">al mes</span>
          </p>
          <p className="text-sm text-muted-foreground">Menos llamadas, WhatsApp y cotizaciones a mano.</p>
        </div>
      </div>
    </div>
  );
}
