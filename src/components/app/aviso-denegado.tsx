"use client";
import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

/** Muestra un aviso cuando el middleware redirige por falta de permisos. */
export function AvisoDenegado() {
  const params = useSearchParams();
  const router = useRouter();
  const ruta = usePathname();
  useEffect(() => {
    if (params.get("denegado") === "1") {
      toast.error("No tienes permiso para ver esa sección. Te llevamos a tu inicio.");
      router.replace(ruta);
    }
  }, [params, router, ruta]);
  return null;
}
