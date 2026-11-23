import { z } from "zod";

export const esquemaSugerencias = z.object({
  sedeId: z.string().min(1),
  personas: z.coerce.number().int().min(1, "Mínimo 1 persona").max(20000),
  dias: z.coerce.number().int().min(1, "Mínimo 1 día").max(90, "Máximo 90 días"),
  modelo: z.enum(["BASE", "HOLT"]),
  items: z
    .array(
      z.object({
        productoId: z.string().min(1),
        ofertaId: z.string().min(1),
        stock: z.coerce.number().int().min(0),
        pronostico: z.coerce.number().min(0),
        cantidadSugerida: z.coerce.number().int().positive(),
      }),
    )
    .min(1, "Selecciona al menos una sugerencia"),
});

export const esquemaStock = z.object({
  sedeId: z.string().min(1),
  productoId: z.string().min(1),
  cantidad: z.coerce.number().int("Debe ser un número entero").min(0, "No puede ser negativo"),
});
