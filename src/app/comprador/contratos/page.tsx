import type { Metadata } from "next";
import { FileSignature } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { contratosEmpresa } from "@/modules/contratos/consultas";
import { TarjetaContrato } from "@/modules/contratos/componentes/tarjeta-contrato";

export const metadata: Metadata = { title: "Contratos" };

export default async function ContratosComprador() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const contratos = await contratosEmpresa(usuario.empresaId!);
  return (
    <>
      <Encabezado titulo="Contratos de abastecimiento" descripcion="Contratos programados que nacen de una licitación adjudicada, con su calendario y la trazabilidad de cada entrega." />
      {contratos.length === 0 ? (
        <EstadoVacio icono={<FileSignature className="size-7" />} titulo="Aún no tienes contratos" descripcion="Se crean al adjudicar una licitación." />
      ) : (
        <div className="space-y-4">
          {contratos.map((c) => (
            <TarjetaContrato key={c.id} c={c} contraparte={c.proveedor.razonSocial} />
          ))}
        </div>
      )}
    </>
  );
}
