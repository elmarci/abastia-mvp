import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Button } from "@/components/ui/button";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { sedesYActual } from "@/lib/sede";
import { num } from "@/lib/formato";
import { primeraFechaEntrega, hoyEnLima, FERIADOS } from "@/lib/negocio";
import { obtenerCarrito } from "@/modules/pedidos/carrito";
import { VistaCarrito } from "@/modules/pedidos/componentes/vista-carrito";

export const metadata: Metadata = { title: "Pedido consolidado" };

export default async function PaginaCarrito() {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  const [carrito, { sedes, actual }] = await Promise.all([obtenerCarrito(usuario.id), sedesYActual(usuario.empresaId!)]);

  return (
    <>
      <Encabezado titulo="Pedido consolidado" descripcion="Un solo pedido con productos de varios proveedores. Cada proveedor recibe su parte." />
      {carrito.items.length === 0 ? (
        <EstadoVacio
          icono={<ShoppingCart className="size-7" />}
          titulo="Tu pedido está vacío"
          descripcion="Agrega productos desde el catálogo o usa las sugerencias del planificador con IA."
          accion={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/comprador/catalogo">Ir al catálogo</Link>
              </Button>
              {usuario.rol !== "MAYORISTA" && (
                <Button asChild variant="outline">
                  <Link href="/comprador/planificador">Abrir planificador</Link>
                </Button>
              )}
            </div>
          }
        />
      ) : (
        <VistaCarrito
          carrito={carrito}
          sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre, distrito: s.distrito, limite: num(s.montoLimiteAprobacion) }))}
          sedeInicial={actual?.id ?? ""}
          fechaMinima={primeraFechaEntrega()}
          hoy={hoyEnLima()}
          feriados={[...FERIADOS]}
          mayorista={usuario.rol === "MAYORISTA"}
        />
      )}
    </>
  );
}
