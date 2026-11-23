import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { hoyEnLima, sumarDias } from "@/lib/negocio";
import { FormularioLicitacion } from "@/modules/licitaciones/componentes/formulario-licitacion";

export const metadata: Metadata = { title: "Nueva licitación" };

export default async function NuevaLicitacion() {
  await requerirPagina(["COMPRADOR", "APROBADOR"]);
  return (
    <>
      <Encabezado titulo="Nueva licitación" descripcion="Define las bases y cómo vas a evaluar. Los pesos de los criterios deben sumar 100 %." />
      <FormularioLicitacion cierreSugerido={`${sumarDias(hoyEnLima(), 10)}T18:00`} />
    </>
  );
}
