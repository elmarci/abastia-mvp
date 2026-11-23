import type { DefaultSession } from "next-auth";
import type { RolUsuario } from "@/lib/permisos";

declare module "next-auth" {
  interface User {
    rol: RolUsuario;
    empresaId: string | null;
    proveedorId: string | null;
  }
  interface Session {
    user: {
      id: string;
      rol: RolUsuario;
      empresaId: string | null;
      proveedorId: string | null;
    } & DefaultSession["user"];
  }
}
