import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { requerirPagina } from "@/lib/sesion";
import { ROLES_COMPRADOR } from "@/lib/permisos";
import { categorias, listarCatalogo, type OrdenCatalogo } from "@/modules/catalogo/consultas";
import { FiltrosCatalogo } from "@/modules/catalogo/componentes/filtros";
import { TarjetaProducto } from "@/modules/catalogo/componentes/tarjeta-producto";

export const metadata: Metadata = { title: "Catálogo" };

export default async function PaginaCatalogo({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; orden?: string }> }) {
  const usuario = await requerirPagina(ROLES_COMPRADOR);
  const params = await searchParams;
  const orden = (["relevancia", "precio-asc", "precio-desc", "ahorro"].includes(params.orden ?? "") ? params.orden : "relevancia") as OrdenCatalogo;
  const [productos, cats] = await Promise.all([listarCatalogo({ q: params.q, categoria: params.categoria, orden }), categorias()]);
  const mayorista = usuario.rol === "MAYORISTA";

  return (
    <>
      <Encabezado
        titulo={mayorista ? "Catálogo mayorista" : "Catálogo multiproveedor"}
        descripcion={
          mayorista
            ? "Precios escalonados por volumen: mientras más compras, menos pagas por unidad."
            : "Compara precios de proveedores homologados y arma un solo pedido con todos."
        }
      />
      <FiltrosCatalogo categorias={cats.map((c) => ({ slug: c.slug, nombre: c.nombre, icono: c.icono }))} />
      <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
        {productos.length} {productos.length === 1 ? "producto" : "productos"}
      </p>
      {productos.length === 0 ? (
        <EstadoVacio icono={<PackageSearch className="size-7" />} titulo="No encontramos productos" descripcion="Prueba con otra palabra o quita los filtros." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {productos.map((p) => (
            <TarjetaProducto key={p.id} producto={p} mayorista={mayorista} />
          ))}
        </div>
      )}
    </>
  );
}
