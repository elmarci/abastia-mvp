import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { sedesYActual } from "@/lib/sede";
import { primeraFechaEntrega } from "@/lib/negocio";
import { datosNuevaSolicitud } from "@/modules/cotizaciones/consultas";
import { FormularioSolicitud } from "@/modules/cotizaciones/componentes/formulario-solicitud";

export const metadata: Metadata = { title: "Nueva solicitud de cotización" };

export default async function NuevaSolicitud() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const [{ sedes, actual }, datos] = await Promise.all([sedesYActual(usuario.empresaId!), datosNuevaSolicitud()]);
  return (
    <>
      <Encabezado titulo="Nueva solicitud de cotización" descripcion="Los proveedores invitados responden con precio, plazo y condiciones." />
      <FormularioSolicitud sedes={sedes.map((s) => ({ id: s.id, nombre: s.nombre }))} sedeInicial={actual?.id ?? ""} fechaMinima={primeraFechaEntrega()} productos={datos.productos} proveedores={datos.proveedores} />
    </>
  );
}
