import { PrismaClient } from "@prisma/client";

// Reutilizamos una sola instancia en desarrollo para no agotar conexiones
const globalParaPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalParaPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalParaPrisma.prisma = prisma;
}
