"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";

type ResultadoAccion = { ok: true; datos?: unknown; mensaje?: string } | { ok: false; error: string };

/**
 * Botón que ejecuta una Server Action (ya enlazada con sus argumentos),
 * muestra el resultado en un aviso y refresca la página o navega.
 */
export function BotonAccion({
  accion,
  children,
  irA,
  ...props
}: Omit<ButtonProps, "onClick"> & { accion: () => Promise<ResultadoAccion>; /** Ruta a la que navegar al terminar; ":id" se reemplaza por datos.id. */ irA?: string }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  return (
    <Button
      {...props}
      disabled={pendiente || props.disabled}
      onClick={() => {
        iniciar(async () => {
          const r = await accion();
          if (!r.ok) {
            toast.error(r.error);
            return;
          }
          if (r.mensaje) toast.success(r.mensaje);
          if (irA) router.push(irA.replace(":id", String((r.datos as { id?: string } | undefined)?.id ?? "")));
          else router.refresh();
        });
      }}
    >
      {pendiente && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  );
}
