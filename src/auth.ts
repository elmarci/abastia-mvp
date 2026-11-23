import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/prisma";

const credencialesSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Correo y contraseña",
      credentials: { email: {}, password: {} },
      async authorize(credenciales) {
        const datos = credencialesSchema.safeParse(credenciales);
        if (!datos.success) return null;
        const usuario = await prisma.usuario.findUnique({
          where: { email: datos.data.email.toLowerCase() },
          include: { proveedor: { select: { estado: true } } },
        });
        if (!usuario) return null;
        const valida = await bcrypt.compare(datos.data.password, usuario.passwordHash);
        if (!valida) return null;
        return {
          id: usuario.id,
          name: usuario.nombre,
          email: usuario.email,
          rol: usuario.rol,
          empresaId: usuario.empresaId,
          proveedorId: usuario.proveedorId,
        };
      },
    }),
  ],
});
