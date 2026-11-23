import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Protege las áreas privadas según el rol (ver src/lib/permisos.ts)
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/comprador/:path*", "/proveedor/:path*", "/admin/:path*", "/cuenta/:path*"],
};
