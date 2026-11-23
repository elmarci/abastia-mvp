import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/marca/logo";
import { FormulariosRegistro } from "@/modules/auth/componentes/formularios-registro";

export const metadata: Metadata = { title: "Registro" };

export default async function Registro({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
        <Link href="/">
          <Logo />
        </Link>
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          ¿Ya tienes cuenta? <span className="font-medium text-primary">Ingresa</span>
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">Crea tu cuenta</h1>
        <p className="mt-2 text-muted-foreground">Empresas, instituciones y bodegas compran; productores y distribuidores venden.</p>
        <FormulariosRegistro inicial={tipo === "proveedor" ? "proveedor" : tipo === "consumidor" ? "consumidor" : "empresa"} />
      </main>
    </div>
  );
}
