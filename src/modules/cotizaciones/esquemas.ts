import { z } from "zod";
import { validarFechaEntrega } from "@/lib/negocio/fechas";
import { esquemaCantidad } from "@/modules/pedidos/esquemas";

/** [Alcance ampliado] Solicitud de cotización (RFQ) del comprador. */
export const esquemaSolicitud = z.object({
  sedeId: z.string().min(1, "Elige la sede"),
  titulo: z.string().trim().min(4, "Escribe un título de al menos 4 caracteres").max(120),
  fechaRequerida: z.string().superRefine((valor, ctx) => {
    const error = validarFechaEntrega(valor);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }),
  items: z
    .array(z.object({ productoId: z.string().min(1, "Elige un producto"), cantidad: esquemaCantidad }))
    .min(1, "Agrega al menos un producto")
    .max(30)
    .refine((items) => new Set(items.map((i) => i.productoId)).size === items.length, "Hay productos repetidos"),
  /** Proveedores elegidos; vacío = todos los homologados de las categorías. */
  proveedorIds: z.array(z.string()).max(20),
});

/** Respuesta del proveedor con precio por ítem, plazo y condiciones. */
export const esquemaRespuesta = z.object({
  solicitudId: z.string().min(1),
  plazoDias: z.coerce.number().int().min(1, "El plazo mínimo es 1 día").max(60),
  condiciones: z.string().trim().min(5, "Describe tus condiciones").max(300),
  precios: z.array(z.object({ itemSolicitudId: z.string().min(1), precioUnitario: z.coerce.number().positive("Ingresa un precio mayor que cero").max(100000) })).min(1),
});

/** Etiqueta y color de cada estado de la solicitud. */
export const ESTADO_SOLICITUD = {
  ABIERTA: { texto: "Abierta", variante: "info" },
  CONVERTIDA: { texto: "Convertida en pedido", variante: "exito" },
  CERRADA: { texto: "Cerrada", variante: "secondary" },
} as const;

