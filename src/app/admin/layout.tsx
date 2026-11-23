import { AreaPrivada } from "@/components/app/area-privada";
import { requerirPagina } from "@/lib/sesion";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const usuario = await requerirPagina(["ADMIN"]);
  return <AreaPrivada usuario={usuario}>{children}</AreaPrivada>;
}
