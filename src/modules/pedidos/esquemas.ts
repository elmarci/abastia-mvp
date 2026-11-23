import { z } from "zod";
import { validarFechaEntrega } from "@/lib/negocio/fechas";

/** Esquemas compartidos entre el formulario y el servidor. */
export const esquemaCantidad = z.coerce
  .number({ invalid_type_error: "Ingresa una cantidad" })
  .int("La cantidad debe ser un número entero")
  .positive("La cantidad debe ser mayor que cero")
  .max(100000, "Cantidad demasiado grande");

export const esquemaAgregar = z.object({
  ofertaId: z.string().min(1),
  cantidad: esquemaCantidad,
});

export const esquemaConfirmar = z.object({
  sedeId: z.string().min(1, "Elige la sede de entrega"),
  fechaEntrega: z.string().superRefine((valor, ctx) => {
    const error = validarFechaEntrega(valor);
    if (error) ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
  }),
  metodoPago: z.enum(["TRANSFERENCIA", "TARJETA", "CREDITO_30"]),
  notas: z.string().max(500).optional(),
});

export const esquemaRecepcion = z
  .object({
    subPedidoId: z.string().min(1),
    conforme: z.boolean(),
    tipoObservacion: z.enum(["Producto faltante", "Producto dañado", "Fuera de fecha", "Otro"]).optional(),
    observacion: z.string().max(500).optional(),
    calificacion: z.coerce.number().int().min(1, "Califica de 1 a 5 estrellas").max(5),
    temperatura: z.coerce.number().min(-30).max(40).optional(),
  })
  .refine((d) => d.conforme || (d.tipoObservacion && (d.observacion ?? "").trim().length >= 5), {
    message: "Describe la observación (mínimo 5 caracteres)",
    path: ["observacion"],
  });

export const esquemaRechazo = z.object({
  id: z.string().min(1),
  motivo: z.string().trim().min(5, "Indica el motivo (mínimo 5 caracteres)").max(300),
});
