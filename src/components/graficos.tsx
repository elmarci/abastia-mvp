"use client";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { soles } from "@/lib/formato";

/** Tooltip con tokens de texto (nunca el color de la serie). */
function Ayuda({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2 text-xs shadow-lg">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground cifra">{soles(payload[0].value)}</p>
    </div>
  );
}

const eje = { fontSize: 11, fill: "var(--muted-foreground)" };
const compacto = (v: number) => (v >= 1000 ? `S/ ${(v / 1000).toLocaleString("es-PE", { maximumFractionDigits: 1 })} mil` : `S/ ${v}`);

/** Barras verticales de una sola serie (p. ej. gasto mensual). */
export function GraficoColumnas({ datos, destacarUltimo = false, alto = 260 }: { datos: { etiqueta: string; valor: number }[]; destacarUltimo?: boolean; alto?: number }) {
  return (
    <div style={{ height: alto }} role="img" aria-label={`Gráfico de barras: ${datos.map((d) => `${d.etiqueta} ${soles(d.valor)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tick={eje} />
          <YAxis tickLine={false} axisLine={false} tick={eje} width={70} tickFormatter={compacto} />
          <Tooltip content={<Ayuda />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={44}>
            {datos.map((_, i) => (
              <Cell key={i} fill="var(--chart-1)" fillOpacity={destacarUltimo && i !== datos.length - 1 ? 0.55 : 1} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barras horizontales de una sola serie (p. ej. gasto por categoría o por sede). */
export function GraficoBarrasH({ datos, alto }: { datos: { etiqueta: string; valor: number }[]; alto?: number }) {
  const h = alto ?? Math.max(120, datos.length * 38);
  return (
    <div style={{ height: h }} role="img" aria-label={`Gráfico de barras horizontales: ${datos.map((d) => `${d.etiqueta} ${soles(d.valor)}`).join(", ")}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
          <CartesianGrid horizontal={false} stroke="var(--border)" />
          <XAxis type="number" tickLine={false} axisLine={false} tick={eje} tickFormatter={compacto} />
          <YAxis type="category" dataKey="etiqueta" tickLine={false} axisLine={false} tick={eje} width={118} />
          <Tooltip content={<Ayuda />} cursor={{ fill: "var(--muted)", opacity: 0.6 }} />
          <Bar dataKey="valor" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
