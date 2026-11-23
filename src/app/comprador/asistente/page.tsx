import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { claudeDisponible } from "@/modules/asistente/claude";
import { ChatAsistente } from "@/modules/asistente/componentes/chat-asistente";

export const metadata: Metadata = { title: "Asistente de compras" };

export default async function PaginaAsistente() {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  const historial = await prisma.mensajeAsistente.findMany({ where: { usuarioId: usuario.id }, orderBy: { creadoEn: "desc" }, take: 20 });
  return (
    <>
      <Encabezado titulo="Asistente de compras" descripcion="Pide en lenguaje natural. El asistente busca los productos, arma la propuesta y tú confirmas." />
      <ChatAsistente historial={historial.reverse().map((m) => ({ id: m.id, autor: m.autor === "USUARIO" ? "USUARIO" : "ASISTENTE", contenido: m.contenido }))} conClaude={claudeDisponible()} />
    </>
  );
}
