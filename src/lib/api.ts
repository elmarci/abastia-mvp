import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ErrorAcceso } from "@/lib/sesion";
import { ErrorNegocio } from "@/lib/acciones";

/** Envuelve un manejador de ruta API y traduce errores a códigos HTTP. */
export async function responder<T>(fn: () => Promise<T>) {
  try {
    const datos = await fn();
    return NextResponse.json(datos);
  } catch (error) {
    if (error instanceof ErrorAcceso) {
      return NextResponse.json({ error: error.message }, { status: error.estado });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Datos no válidos" }, { status: 400 });
    }
    if (error instanceof ErrorNegocio) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    console.error(error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
