import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { INICIO_POR_ROL, type RolUsuario } from "@/lib/permisos";

export type UsuarioSesion = {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  empresaId: string | null;
  proveedorId: string | null;
};

/** Error de autorización que las rutas API convierten en 401/403. */
export class ErrorAcceso extends Error {
  constructor(
    public estado: 401 | 403 | 404,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export async function usuarioActual(): Promise<UsuarioSesion | null> {
  const sesion = await auth();
  if (!sesion?.user?.id) return null;
  return {
    id: sesion.user.id,
    nombre: sesion.user.name ?? "",
    email: sesion.user.email ?? "",
    rol: sesion.user.rol,
    empresaId: sesion.user.empresaId,
    proveedorId: sesion.user.proveedorId,
  };
}

/** Para páginas: exige sesión y rol; si no, redirige. */
export async function requerirPagina(roles: readonly RolUsuario[]): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();
  if (!usuario) redirect("/login");
  if (!roles.includes(usuario.rol)) redirect(`${INICIO_POR_ROL[usuario.rol]}?denegado=1`);
  return usuario;
}

/** Para Server Actions y rutas API: exige sesión y rol; si no, lanza ErrorAcceso. */
export async function requerirRol(roles: readonly RolUsuario[]): Promise<UsuarioSesion> {
  const usuario = await usuarioActual();
  if (!usuario) throw new ErrorAcceso(401, "Debes iniciar sesión");
  if (!roles.includes(usuario.rol)) throw new ErrorAcceso(403, "No tienes permiso para esta acción");
  return usuario;
}

/** Comprador con empresa asociada (aislamiento multiempresa). */
export async function requerirEmpresa(roles: readonly RolUsuario[] = ["COMPRADOR", "APROBADOR", "MAYORISTA"]) {
  const usuario = await requerirRol(roles);
  if (!usuario.empresaId) throw new ErrorAcceso(403, "Tu usuario no pertenece a una empresa");
  return { ...usuario, empresaId: usuario.empresaId };
}

export async function requerirProveedor() {
  const usuario = await requerirRol(["PROVEEDOR"]);
  if (!usuario.proveedorId) throw new ErrorAcceso(403, "Tu usuario no pertenece a un proveedor");
  return { ...usuario, proveedorId: usuario.proveedorId };
}
