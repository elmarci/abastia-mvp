import { z } from "zod";
import { validarRuc } from "@/lib/negocio/validadores";

/** Esquemas compartidos entre cliente y servidor. */
export const esquemaLogin = z.object({
  email: z.string().trim().email("Ingresa un correo válido"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

const ruc = z
  .string()
  .trim()
  .regex(/^\d{11}$/, "El RUC debe tener 11 dígitos")
  .refine(validarRuc, "El RUC no es válido (revisa el dígito verificador)");

const contrasena = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Incluye al menos una mayúscula")
  .regex(/[0-9]/, "Incluye al menos un número");

export const TIPOS_ORGANIZACION = [
  ["OFICINA", "Oficina"],
  ["RESTAURANTE", "Restaurante"],
  ["HOTEL", "Hotel"],
  ["PROCESADORA", "Procesadora"],
  ["RESIDENCIA", "Residencia"],
  ["HOSPITAL", "Hospital o clínica"],
  ["COLEGIO", "Colegio o centro de estudios"],
  ["PROYECTO", "Proyecto o campamento"],
  ["BODEGA", "Bodega o minimarket"],
  ["OTRO", "Otro"],
] as const;

export const esquemaRegistroEmpresa = z.object({
  ruc,
  razonSocial: z.string().trim().min(3, "Ingresa la razón social"),
  tipo: z.enum(["OFICINA", "RESTAURANTE", "HOTEL", "PROCESADORA", "RESIDENCIA", "HOSPITAL", "COLEGIO", "PROYECTO", "BODEGA", "OTRO"]),
  distrito: z.string().min(2, "Elige un distrito"),
  nombre: z.string().trim().min(3, "Ingresa tu nombre"),
  email: z.string().trim().email("Ingresa un correo válido"),
  password: contrasena,
  sedeNombre: z.string().trim().min(2, "Ingresa el nombre de la sede"),
  sedeDireccion: z.string().trim().min(5, "Ingresa la dirección"),
  sedeDistrito: z.string().min(2, "Elige el distrito de la sede"),
  personas: z.coerce.number().int("Debe ser un número entero").min(1, "Mínimo 1 persona").max(20000),
  montoLimite: z.coerce.number().min(0, "No puede ser negativo"),
  minutosCompraBase: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(2000),
});

export const CATEGORIAS_PROVEEDOR = ["Abarrotes", "Bebidas", "Café y oficina", "Limpieza e higiene", "Descartables", "Frescos", "Lácteos", "Carnes"] as const;

export const esquemaRegistroProveedor = z.object({
  ruc,
  razonSocial: z.string().trim().min(3, "Ingresa la razón social"),
  tipo: z.enum(["Productor", "Cooperativa", "Fabricante", "Mayorista", "Distribuidor"]),
  categorias: z.array(z.string()).min(1, "Elige al menos una categoría"),
  zonaReparto: z.string().trim().min(3, "Indica tu zona de reparto"),
  nombre: z.string().trim().min(3, "Ingresa tu nombre"),
  email: z.string().trim().email("Ingresa un correo válido"),
  telefono: z.string().trim().regex(/^9\d{8}$/, "Celular de 9 dígitos que empiece con 9"),
  password: contrasena,
});

export const esquemaRegistroConsumidor = z.object({
  nombre: z.string().trim().min(3, "Ingresa tu nombre"),
  email: z.string().trim().email("Ingresa un correo válido"),
  password: contrasena,
  direccion: z.string().trim().min(5, "Ingresa tu dirección"),
  distrito: z.string().min(2, "Elige tu distrito"),
  telefono: z.string().trim().regex(/^9\d{8}$/, "Celular de 9 dígitos que empiece con 9"),
});
