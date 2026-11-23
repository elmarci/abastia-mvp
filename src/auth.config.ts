import type { NextAuthConfig } from "next-auth";
import { esRutaPrivada, INICIO_POR_ROL, puedeAcceder, type RolUsuario } from "@/lib/permisos";

/**
 * Configuración compatible con el entorno edge (middleware).
 * No importa Prisma ni bcrypt.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // Al iniciar sesión copiamos los datos del usuario al token
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
        token.empresaId = user.empresaId;
        token.proveedorId = user.proveedorId;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rol = token.rol as RolUsuario;
      session.user.empresaId = (token.empresaId as string | null) ?? null;
      session.user.proveedorId = (token.proveedorId as string | null) ?? null;
      return session;
    },
    authorized({ auth, request }) {
      const ruta = request.nextUrl.pathname;
      if (!esRutaPrivada(ruta)) {
        return true;
      }
      const usuario = auth?.user;
      // Sin sesión: redirige al login
      if (!usuario) {
        return false;
      }
      // Con sesión pero sin permiso: redirige a su inicio
      if (!puedeAcceder(usuario.rol, ruta)) {
        const url = new URL(INICIO_POR_ROL[usuario.rol], request.nextUrl);
        url.searchParams.set("denegado", "1");
        return Response.redirect(url);
      }
      return true;
    },
  },
} satisfies NextAuthConfig;
