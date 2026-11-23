import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { competitividadProveedor } from "@/modules/proveedor/consultas";
import { GestorCatalogo } from "@/modules/proveedor/componentes/gestor-catalogo";

export const metadata: Metadata = { title: "Mi catálogo" };

export default async function CatalogoProveedor() {
  const usuario = await requerirPagina(["PROVEEDOR"]);
  const [ofertas, productos] = await Promise.all([
    competitividadProveedor(usuario.proveedorId!),
    prisma.producto.findMany({ select: { id: true, nombre: true, emoji: true }, orderBy: { nombre: "asc" } }),
  ]);
  return (
    <>
      <Encabezado titulo="Mi catálogo" descripcion="Publica tus precios, stock, pedido mínimo y plazo de entrega. Los cambios se ven al instante en el catálogo de los compradores." />
      <GestorCatalogo ofertas={ofertas} productos={productos} />
    </>
  );
}
