/**
 * Permisos por rol: qué rutas puede ver cada rol y cuál es su inicio.
 * Se usa en middleware.ts (edge) y en el servidor, por eso no importa Prisma.
 */
export type RolUsuario = "COMPRADOR" | "APROBADOR" | "PROVEEDOR" | "ADMIN" | "MAYORISTA" | "CONSUMIDOR";

export const ETIQUETAS_ROL: Record<RolUsuario, string> = {
  COMPRADOR: "Comprador",
  APROBADOR: "Aprobador",
  PROVEEDOR: "Proveedor",
  ADMIN: "Administrador",
  MAYORISTA: "Comprador mayorista",
  CONSUMIDOR: "Consumidor final",
};

export const INICIO_POR_ROL: Record<RolUsuario, string> = {
  COMPRADOR: "/comprador",
  APROBADOR: "/comprador",
  MAYORISTA: "/comprador/catalogo",
  PROVEEDOR: "/proveedor",
  ADMIN: "/admin",
  CONSUMIDOR: "/cuenta",
};

/** Prefijos de ruta permitidos para cada rol. */
const RUTAS_POR_ROL: Record<RolUsuario, readonly string[]> = {
  COMPRADOR: ["/comprador"],
  APROBADOR: ["/comprador"],
  MAYORISTA: ["/comprador/catalogo", "/comprador/carrito", "/comprador/pedidos", "/comprador/asistente"],
  PROVEEDOR: ["/proveedor"],
  ADMIN: ["/admin"],
  CONSUMIDOR: ["/cuenta"],
};

/** Rutas del comprador reservadas para el aprobador. */
const SOLO_APROBADOR = ["/comprador/aprobaciones"];

/** Áreas privadas de la aplicación. */
export const AREAS_PRIVADAS = ["/comprador", "/proveedor", "/admin", "/cuenta"];

export function esRutaPrivada(ruta: string): boolean {
  return AREAS_PRIVADAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}

function coincide(ruta: string, prefijo: string): boolean {
  return ruta === prefijo || ruta.startsWith(`${prefijo}/`);
}

/** Indica si un rol puede acceder a una ruta de página. */
export function puedeAcceder(rol: RolUsuario, ruta: string): boolean {
  if (SOLO_APROBADOR.some((p) => coincide(ruta, p)) && rol !== "APROBADOR") {
    return false;
  }
  return RUTAS_POR_ROL[rol].some((p) => coincide(ruta, p));
}

export const ROLES_COMPRADOR: RolUsuario[] = ["COMPRADOR", "APROBADOR", "MAYORISTA"];
