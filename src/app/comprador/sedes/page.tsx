import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { num } from "@/lib/formato";
import { GestorSedes } from "@/modules/auth/componentes/gestor-sedes";

export const metadata: Metadata = { title: "Sedes" };

export default async function Sedes() {
  const usuario = await requerirPagina(["COMPRADOR", "APROBADOR"]);
  const empresa = await prisma.empresa.findUniqueOrThrow({ where: { id: usuario.empresaId! }, include: { sedes: { orderBy: { creadoEn: "asc" } } } });
  return (
    <>
      <Encabezado titulo="Sedes" descripcion={`${empresa.razonSocial} · plan ${empresa.plan === "BASICO" ? "Básico" : empresa.plan === "PRO" ? "Pro" : "Corporativo"}. Los pedidos que superan el monto límite de la sede requieren aprobación.`} />
      <GestorSedes
        esAprobador={usuario.rol === "APROBADOR"}
        sedes={empresa.sedes.map((s) => ({ id: s.id, nombre: s.nombre, direccion: s.direccion, distrito: s.distrito, personas: s.personas, montoLimiteAprobacion: num(s.montoLimiteAprobacion) }))}
      />
    </>
  );
}
