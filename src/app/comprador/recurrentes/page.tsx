import type { Metadata } from "next";
import { Repeat } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { hoyEnLima, sumarDias } from "@/lib/negocio";
import { pedidosParaRecurrente, recurrentesEmpresa } from "@/modules/recurrentes/consultas";
import { EditorRecurrente } from "@/modules/recurrentes/componentes/editor-recurrente";
import { NuevoRecurrente } from "@/modules/recurrentes/componentes/nuevo-recurrente";

export const metadata: Metadata = { title: "Pedidos recurrentes" };

export default async function PaginaRecurrentes() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const [lista, pedidos] = await Promise.all([recurrentesEmpresa(usuario.empresaId!), pedidosParaRecurrente(usuario.empresaId!)]);
  const fechaMinima = sumarDias(hoyEnLima(), 1);
  return (
    <>
      <Encabezado titulo="Pedidos recurrentes" descripcion="Se generan solos cada semana, quincena o mes (cron diario a las 6:00 a. m.). Puedes editarlos antes de cada ejecución." />
      <div className="space-y-4">
        {pedidos.length > 0 && <NuevoRecurrente pedidos={pedidos} />}
        {lista.length === 0 ? (
          <EstadoVacio icono={<Repeat className="size-7" />} titulo="Aún no tienes pedidos recurrentes" descripcion="Crea uno a partir de un pedido anterior." />
        ) : (
          lista.map((r) => <EditorRecurrente key={r.id} r={r} fechaMinima={fechaMinima} />)
        )}
      </div>
    </>
  );
}
