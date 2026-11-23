import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/marca/logo";
import { FormularioLogin } from "@/modules/auth/componentes/formulario-login";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function PaginaLogin() {
  return (
    <div className="grid grid-cols-1 min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Link href="/" className="w-fit">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-semibold tracking-tight">Bienvenido de vuelta</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ingresa con tu cuenta o usa una cuenta demo para la exposición.</p>
          <Suspense>
            <FormularioLogin />
          </Suspense>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            ¿Aún no tienes cuenta?{" "}
            <Link href="/registro" className="font-medium text-primary hover:underline">
              Registra tu empresa o tu negocio proveedor
            </Link>
          </p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-primary lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(242,169,59,0.35),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.12),transparent_40%)]" />
        <div className="relative flex h-full flex-col justify-end p-12 text-primary-foreground">
          <p className="text-sm font-medium uppercase tracking-widest text-white/70">AbastIA</p>
          <p className="mt-3 max-w-md text-4xl font-semibold leading-tight">Compra justa, a precio justo.</p>
          <p className="mt-4 max-w-md text-white/80">
            Todo lo que tu organización consume, a precio cercano al de origen, en la cantidad justa y con calidad garantizada, desde una sola plataforma.
          </p>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-sm">
            {[
              ["8 %+", "ahorro promedio"],
              ["12", "proveedores homologados"],
              ["−50 %", "tiempo comprando"],
            ].map(([v, t]) => (
              <div key={t} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-semibold cifra">{v}</p>
                <p className="text-white/75">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
