import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fecha, soles } from "@/lib/formato";
import { requerirPagina } from "@/lib/sesion";
import { listarPedidos } from "@/modules/pedidos/consultas";
import { EstadoBadge } from "@/modules/pedidos/componentes/estado";

export const metadata: Metadata = { title: "Mis compras" };

export default async function MisCompras() {
  const usuario = await requerirPagina(["CONSUMIDOR"]);
  const pedidos = await listarPedidos(usuario);
  return (
    <>
      <Encabezado
        titulo="Mis compras"
        descripcion="Sigue tus entregas y revisa tu historial."
        acciones={
          <Button asChild>
            <Link href="/tienda">
              <ShoppingBag /> Ir a la tienda
            </Link>
          </Button>
        }
      />
      {pedidos.length === 0 ? (
        <EstadoVacio icono={<ShoppingBag className="size-7" />} titulo="Aún no tienes compras" descripcion="Arma tu canasta en la tienda." />
      ) : (
        <div className="space-y-3">
          {pedidos.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <Link href={`/cuenta/pedidos/${p.id}`} className="font-semibold hover:text-primary" data-testid="enlace-compra">
                    {p.codigo}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {fecha(p.creadoEn)} · {p.distritoEntrega}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <EstadoBadge estado={p.estado} />
                  <span className="font-semibold cifra">{soles(p.total)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
