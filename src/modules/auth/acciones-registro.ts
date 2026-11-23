"use server";
import bcrypt from "bcryptjs";
import type { z } from "zod";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { ejecutar, ErrorNegocio, type Resultado } from "@/lib/acciones";
import { esquemaRegistroConsumidor, esquemaRegistroEmpresa, esquemaRegistroProveedor } from "@/modules/auth/esquemas";

async function correoLibre(email: string) {
  if (await prisma.usuario.findUnique({ where: { email } })) throw new ErrorNegocio("Ya existe una cuenta con ese correo");
}

/** Registro de empresa compradora con su primera sede. */
export async function registrarEmpresa(entrada: z.input<typeof esquemaRegistroEmpresa>): Promise<Resultado> {
  const r = await ejecutar(async () => {
    const d = esquemaRegistroEmpresa.parse(entrada);
    const email = d.email.toLowerCase();
    await correoLibre(email);
    if (await prisma.empresa.findUnique({ where: { ruc: d.ruc } })) throw new ErrorNegocio("Esa empresa (RUC) ya está registrada");
    await prisma.empresa.create({
      data: {
        ruc: d.ruc,
        razonSocial: d.razonSocial,
        tipo: d.tipo,
        distrito: d.distrito,
        plan: "BASICO",
        minutosCompraBase: d.minutosCompraBase,
        sedes: { create: { nombre: d.sedeNombre, direccion: d.sedeDireccion, distrito: d.sedeDistrito, personas: d.personas, personasBase: d.personas, montoLimiteAprobacion: d.montoLimite } },
        usuarios: { create: { nombre: d.nombre, email, passwordHash: await bcrypt.hash(d.password, 10), rol: d.tipo === "BODEGA" ? "MAYORISTA" : "APROBADOR" } },
      },
    });
    return { email, password: d.password };
  });
  if (!r.ok) return r;
  await signIn("credentials", { email: r.datos!.email, password: r.datos!.password, redirectTo: "/comprador?bienvenida=1" });
  return { ok: true };
}

/** Registro de proveedor: queda pendiente de homologación. */
export async function registrarProveedor(entrada: z.input<typeof esquemaRegistroProveedor>): Promise<Resultado> {
  const r = await ejecutar(async () => {
    const d = esquemaRegistroProveedor.parse(entrada);
    const email = d.email.toLowerCase();
    await correoLibre(email);
    if (await prisma.proveedor.findUnique({ where: { ruc: d.ruc } })) throw new ErrorNegocio("Ese proveedor (RUC) ya está registrado");
    await prisma.proveedor.create({
      data: {
        ruc: d.ruc,
        razonSocial: d.razonSocial,
        tipo: d.tipo,
        categorias: d.categorias,
        zonaReparto: d.zonaReparto.split(",").map((z) => z.trim()).filter(Boolean),
        estado: "PENDIENTE",
        telefono: d.telefono,
        contacto: d.nombre,
        documentos: ["Ficha RUC"],
        usuarios: { create: { nombre: d.nombre, email, passwordHash: await bcrypt.hash(d.password, 10), rol: "PROVEEDOR" } },
      },
    });
    const admins = await prisma.usuario.findMany({ where: { rol: "ADMIN" }, select: { id: true } });
    await prisma.notificacion.createMany({ data: admins.map((a) => ({ usuarioId: a.id, titulo: "Nuevo proveedor por homologar", mensaje: `${d.razonSocial} se registró.`, enlace: "/admin/proveedores" })) });
    return { email, password: d.password };
  });
  if (!r.ok) return r;
  await signIn("credentials", { email: r.datos!.email, password: r.datos!.password, redirectTo: "/proveedor" });
  return { ok: true };
}

/** [Alcance ampliado] Registro de consumidor final. */
export async function registrarConsumidor(entrada: z.input<typeof esquemaRegistroConsumidor>, destino = "/tienda"): Promise<Resultado> {
  const r = await ejecutar(async () => {
    const d = esquemaRegistroConsumidor.parse(entrada);
    const email = d.email.toLowerCase();
    await correoLibre(email);
    await prisma.usuario.create({ data: { nombre: d.nombre, email, passwordHash: await bcrypt.hash(d.password, 10), rol: "CONSUMIDOR", direccion: d.direccion, distrito: d.distrito, telefono: d.telefono } });
    return { email, password: d.password };
  });
  if (!r.ok) return r;
  await signIn("credentials", { email: r.datos!.email, password: r.datos!.password, redirectTo: destino.startsWith("/") ? destino : "/tienda" });
  return { ok: true };
}
