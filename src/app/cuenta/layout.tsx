import { AreaPrivada } from "@/components/app/area-privada";
import { requerirPagina } from "@/lib/sesion";

export default async function LayoutCuenta({ children }: { children: React.ReactNode }) {
  const usuario = await requerirPagina(["CONSUMIDOR"]);
  return <AreaPrivada usuario={usuario}>{children}</AreaPrivada>;
}
