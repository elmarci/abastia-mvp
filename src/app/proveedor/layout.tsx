import { AreaPrivada } from "@/components/app/area-privada";
import { requerirPagina } from "@/lib/sesion";

export default async function LayoutProveedor({ children }: { children: React.ReactNode }) {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  return <AreaPrivada usuario={usuario}>{children}</AreaPrivada>;
}
