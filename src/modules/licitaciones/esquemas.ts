import { z } from "zod";
import { pesosValidos } from "@/lib/negocio/licitacion";

export const CERTIFICADOS = ["Registro sanitario DIGESA", "BPM", "HACCP", "Autorización sanitaria SENASA", "ISO 22000"] as const;

export const ETIQUETAS_CRITERIO = { PRECIO: "Precio", CALIDAD: "Calidad y certificaciones", PLAZO: "Plazo de entrega", CALIFICACION: "Calificación" } as const;

export const ESTADO_LICITACION = {
  ABIERTA: { texto: "Abierta", variante: "info" },
  CERRADA: { texto: "Cerrada: por adjudicar", variante: "alerta" },
  ADJUDICADA: { texto: "Adjudicada", variante: "exito" },
  DESIERTA: { texto: "Desierta", variante: "secondary" },
} as const;

/** [Alcance ampliado] Bases de una licitación institucional. */
export const esquemaLicitacion = z.object({
  titulo: z.string().trim().min(6, "Escribe un título más descriptivo").max(140),
  descripcion: z.string().trim().min(10, "Describe el requerimiento").max(1000),
  certificadosObligatorios: z.array(z.enum(CERTIFICADOS)).max(5),
  plazoContratoMeses: z.coerce.number().int().min(1, "Mínimo 1 mes").max(36),
  frecuencia: z.enum(["SEMANAL", "QUINCENAL", "MENSUAL"]),
  volumenEstimado: z.string().trim().min(3, "Indica el volumen estimado").max(200),
  presupuestoReferencial: z.coerce.number().positive().max(100_000_000).optional(),
  fechaCierre: z.string().refine((v) => !Number.isNaN(Date.parse(v)) && Date.parse(v) > Date.now(), "La fecha de cierre debe ser futura"),
  criterios: z
    .array(z.object({ tipo: z.enum(["PRECIO", "CALIDAD", "PLAZO", "CALIFICACION"]), peso: z.coerce.number().int().min(0).max(100) }))
    .length(4)
    .refine((c) => pesosValidos(c), "Los pesos deben sumar 100 %"),
});

/** Propuesta sellada de un proveedor. */
export const esquemaPropuesta = z.object({
  licitacionId: z.string().min(1),
  montoTotal: z.coerce.number().positive("Ingresa el monto total").max(100_000_000),
  plazoEntregaDias: z.coerce.number().int().min(1).max(60),
  certificados: z.array(z.enum(CERTIFICADOS)).max(5),
  descripcion: z.string().trim().min(10, "Describe tu propuesta").max(1000),
});
