import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ErrorAcceso } from "@/lib/sesion";

/** Resultado estándar de una Server Action. */
export type Resultado<T = void> = { ok: true; datos?: T; mensaje?: string } | { ok: false; error: string };

/** Error de negocio con un mensaje claro para el usuario. */
export class ErrorNegocio extends Error {}

/** Ejecuta una acción y convierte cualquier error en un mensaje en español. */
export async function ejecutar<T>(fn: () => Promise<T>, mensaje?: string): Promise<Resultado<T>> {
  try {
    const datos = await fn();
    return { ok: true, datos, mensaje };
  } catch (error) {
    if (error instanceof ZodError) {
      return { ok: false, error: error.issues[0]?.message ?? "Datos no válidos" };
    }
    if (error instanceof ErrorAcceso || error instanceof ErrorNegocio) {
      return { ok: false, error: error.message };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "Ya existe un registro con esos datos" };
    }
    // Errores de redirección de Next.js deben propagarse
    if (error instanceof Error && "digest" in error && String((error as { digest?: string }).digest).startsWith("NEXT_")) {
      throw error;
    }
    console.error(error);
    return { ok: false, error: "Ocurrió un error inesperado. Inténtalo nuevamente." };
  }
}
