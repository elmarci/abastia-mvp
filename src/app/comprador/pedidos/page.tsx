import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Button } from "@/components/ui/button";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { ETIQUETAS_ESTADO } from "@/lib/negocio";
import { listarPedidos } from "@/modules/pedidos/consultas";
import { ListaPedidos } from "@/modules/pedidos/componentes/lista-pedidos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mis pedidos" };

const FILTROS = ["", "PENDIENTE_APROBACION", "RECIBIDO", "CONFIRMADO", "EN_PREPARACION", "EN_CAMINO", "ENTREGADO", "CANCELADO"] as const;

export default async function PaginaPedidos({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  const { estado } = await searchParams;
  const pedidos = await listarPedidos(usuario, { estado });
  return (
    <>
      <Encabezado titulo="Mis pedidos" descripcion="Sigue cada pedido, confirma la recepción y repite tus compras frecuentes en un clic." />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {FILTROS.map((f) => (
          <Link
            key={f || "todos"}
            href={f ? `/comprador/pedidos?estado=${f}` : "/comprador/pedidos"}
            className={cn("shrink-0 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-muted", (estado ?? "") === f && "border-primary bg-primary text-primary-foreground hover:bg-primary/90")}
          >
            {f ? ETIQUETAS_ESTADO[f] : "Todos"}
          </Link>
        ))}
      </div>
      {pedidos.length === 0 ? (
        <EstadoVacio
          icono={<Package className="size-7" />}
          titulo="No hay pedidos aquí"
          descripcion="Cuando confirmes un pedido aparecerá en esta lista."
          accion={
            <Button asChild>
              <Link href="/comprador/catalogo">Ir al catálogo</Link>
            </Button>
          }
        />
      ) : (
        <ListaPedidos pedidos={pedidos} base="/comprador/pedidos" />
      )}
    </>
  );
}
