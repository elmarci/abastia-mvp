import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod/v4";
import type { Interpretacion, ProductoAsistente, SedeAsistente } from "@/lib/negocio";

const MODELO = "claude-opus-5-5";

const Esquema = z.object({
  items: z.array(z.object({ producto: z.string(), cantidad: z.number().int(), nota: z.string().nullable() })),
  sede: z.string().nullable(),
  fecha: z.string().nullable(),
  noEntendidos: z.array(z.string()),
});

/** Indica si el asistente puede usar la API de Claude (opcional). */
export function claudeDisponible() {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Interpreta el pedido con Claude (salida estructurada). Solo devuelve una
 * propuesta; el usuario siempre confirma. Si algo falla, devuelve null y se
 * usan las reglas.
 */
export async function interpretarConClaude(texto: string, productos: readonly ProductoAsistente[], sedes: readonly SedeAsistente[], hoy: string): Promise<Interpretacion | null> {
  if (!claudeDisponible()) return null;
  try {
    const client = new Anthropic({ timeout: 30_000, maxRetries: 1 });
    const catalogo = productos.map((p) => `- ${p.nombre} (se vende por ${p.unidad})`).join("\n");
    const respuesta = await client.messages.parse({
      model: MODELO,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(Esquema) },
      system: `Eres el asistente de compras de AbastIA (Lima, Perú). Convierte el pedido del usuario en una lista de productos del catálogo.
Reglas:
- "producto" debe ser EXACTAMENTE uno de los nombres del catálogo.
- "cantidad" va en la unidad de venta del producto; si el usuario pide kilos o litros y el producto se vende en sacos, cajas o bidones de un contenido indicado en el nombre, convierte redondeando hacia arriba y explícalo en "nota".
- "sede": nombre exacto de una de las sedes si la menciona, o null.
- "fecha": AAAA-MM-DD si menciona un día (hoy es ${hoy}; "el jueves" es el próximo jueves después de hoy), o null.
- Lo que no puedas asociar a un producto va en "noEntendidos".

Sedes: ${sedes.map((s) => `${s.nombre} (${s.distrito})`).join("; ")}

Catálogo:
${catalogo}`,
      messages: [{ role: "user", content: texto }],
    });
    if (respuesta.stop_reason === "refusal" || !respuesta.parsed_output) return null;
    const salida = respuesta.parsed_output;
    const items: Interpretacion["items"] = [];
    const noEntendidos = [...salida.noEntendidos];
    for (const i of salida.items) {
      const p = productos.find((x) => x.nombre === i.producto);
      if (!p || i.cantidad < 1) {
        noEntendidos.push(i.producto);
        continue;
      }
      items.push({ productoId: p.id, cantidad: i.cantidad, texto: i.producto, nota: i.nota });
    }
    const sede = sedes.find((s) => s.nombre === salida.sede) ?? null;
    const fecha = salida.fecha && /^\d{4}-\d{2}-\d{2}$/.test(salida.fecha) ? salida.fecha : null;
    return { items, sedeId: sede?.id ?? null, fecha, noEntendidos };
  } catch (error) {
    if (error instanceof Anthropic.APIError) console.error(`Asistente: error ${error.status} de la API de Claude; se usan reglas`);
    else console.error("Asistente: no se pudo interpretar con Claude; se usan reglas", error);
    return null;
  }
}
