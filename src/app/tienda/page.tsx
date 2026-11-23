import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { Button } from "@/components/ui/button";
import { usuarioActual } from "@/lib/sesion";
import { prisma } from "@/lib/prisma";
import { primeraFechaEntrega } from "@/lib/negocio";
import { productosTienda } from "@/modules/tienda/consultas";
import { Tienda } from "@/modules/tienda/componentes/tienda";

export const metadata: Metadata = { title: "Tienda", description: "Abarrotes, frescos y limpieza por unidad, al precio de los proveedores mayoristas de Lima." };
export const dynamic = "force-dynamic";

/** [Alcance ampliado] Tienda pública retail (no afecta el flujo B2B). */
export default async function PaginaTienda() {
  const [usuario, productos] = await Promise.all([usuarioActual(), productosTienda()]);
  const cliente = usuario?.rol === "CONSUMIDOR" ? await prisma.usuario.findUnique({ where: { id: usuario.id }, select: { nombre: true, direccion: true, distrito: true } }) : null;
  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            {cliente ? (
              <Button asChild variant="outline" size="sm">
                <Link href="/cuenta">Mis compras</Link>
              </Button>
            ) : !usuario ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/login?callbackUrl=/tienda">Ingresar</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tienda AbastIA</h1>
          <p className="text-muted-foreground">Compra por unidad al precio de los proveedores mayoristas. Entrega a domicilio en Lima.</p>
        </div>
        <Tienda productos={productos} cliente={cliente} esOtroRol={!!usuario && usuario.rol !== "CONSUMIDOR"} fechaMinima={primeraFechaEntrega()} />
      </main>
    </div>
  );
}
