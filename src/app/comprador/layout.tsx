import { AreaPrivada } from "@/components/app/area-privada";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";

export default async function LayoutComprador({ children }: { children: React.ReactNode }) {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  return <AreaPrivada usuario={usuario}>{children}</AreaPrivada>;
}
