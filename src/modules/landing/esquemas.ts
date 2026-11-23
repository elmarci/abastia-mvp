import { z } from "zod";

export const esquemaLead = z.object({
  nombre: z.string().trim().min(3, "Ingresa tu nombre"),
  empresa: z.string().trim().min(2, "Ingresa tu organización"),
  email: z.string().trim().email("Ingresa un correo válido"),
  telefono: z.string().trim().regex(/^(9\d{8})?$/, "Celular de 9 dígitos que empiece con 9").optional(),
  tipo: z.string().min(2, "Elige el tipo de organización"),
  personas: z.coerce.number().int().min(1, "Mínimo 1").max(20000).optional(),
  mensaje: z.string().max(500).optional(),
});
