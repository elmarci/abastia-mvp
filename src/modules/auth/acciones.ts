"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requerirEmpresa, requerirRol } from "@/lib/sesion";
import { COOKIE_SEDE } from "@/lib/sede";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { INICIO_POR_ROL } from "@/lib/permisos";
import { esquemaLogin } from "@/modules/auth/esquemas";

/** Inicia sesión con correo y contraseña. */
export async function iniciarSesion(datos: z.infer<typeof esquemaLogin>, destino?: string): Promise<Resultado> {
  const validos = esquemaLogin.safeParse(datos);
  if (!validos.success) return { ok: false, error: "Correo o contraseña no válidos" };
  const usuario = await prisma.usuario.findUnique({ where: { email: validos.data.email.toLowerCase() } });
  try {
    await signIn("credentials", {
      email: validos.data.email.toLowerCase(),
      password: validos.data.password,
      redirectTo: destino && destino.startsWith("/") && !destino.startsWith("//") ? destino : usuario ? INICIO_POR_ROL[usuario.rol] : "/",
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof AuthError) {
      return { ok: false, error: "Correo o contraseña incorrectos" };
    }
    throw error;
  }
}

export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}

/** Cambia la sede activa del comprador (se guarda en una cookie). */
export async function cambiarSede(sedeId: string): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirEmpresa();
    const sede = await prisma.sede.findFirst({ where: { id: sedeId, empresaId: usuario.empresaId } });
    if (!sede) throw new ErrorNegocio("La sede no pertenece a tu empresa");
    (await cookies()).set(COOKIE_SEDE, sede.id, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    revalidatePath("/comprador", "layout");
  });
}

/** Marca como leídas las notificaciones del usuario. */
export async function marcarNotificacionesLeidas(): Promise<Resultado> {
  return ejecutar(async () => {
    const usuario = await requerirRol(["COMPRADOR", "APROBADOR", "PROVEEDOR", "ADMIN", "MAYORISTA", "CONSUMIDOR"]);
    await prisma.notificacion.updateMany({ where: { usuarioId: usuario.id, leida: false }, data: { leida: true } });
  });
}
