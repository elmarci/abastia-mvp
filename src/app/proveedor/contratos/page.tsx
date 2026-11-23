import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { fechaSolo } from "@/lib/formato";
import { contratosProveedor, lotesDelProveedor } from "@/modules/contratos/consultas";
import { TarjetaContrato } from "@/modules/contratos/componentes/tarjeta-contrato";
import { RegistrarEntrega } from "@/modules/contratos/componentes/registrar-entrega";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContratosProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const [contratos, lotes] = await Promise.all([contratosProveedor(usuario.proveedorId!), lotesDelProveedor(usuario.proveedorId!)]);
  const opcionesLote = lotes.map((l) => ({ id: l.id, codigo: l.codigo, producto: l.oferta.producto.nombre }));
  return (
    <>
      <Encabezado titulo="Contratos" descripcion="Entregas programadas de tus contratos adjudicados." />
      {contratos.length === 0 ? (
        <EstadoVacio icono={<CalendarClock className="size-7" />} titulo="Aún no tienes contratos" descripcion="Gana una licitación para empezar." />
      ) : (
        <div className="space-y-4">
          {contratos.map((c) => {
            const proxima = c.entregas.find((e) => e.estado === "PROGRAMADA");
            return (
              <TarjetaContrato
                key={c.id}
                c={c}
                contraparte={c.empresa.razonSocial}
                accion={proxima && <RegistrarEntrega entregaId={proxima.id} fecha={fechaSolo(proxima.fecha)} lotes={opcionesLote} />}
              />
            );
          })}
        </div>
      )}
    </>
  );
}
