import type { Metadata } from "next";
import { Encabezado } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requerirPagina } from "@/lib/sesion";
import { fecha, soles } from "@/lib/formato";
import { TIPOS_ORGANIZACION } from "@/modules/auth/esquemas";
import { listarEmpresas } from "@/modules/admin/consultas";

export const metadata: Metadata = { title: "Empresas" };

export default async function EmpresasAdmin() {
  await requerirPagina(["ADMIN"]);
  const empresas = await listarEmpresas();
  const tipo = (t: string) => TIPOS_ORGANIZACION.find(([v]) => v === t)?.[1] ?? t;
  return (
    <>
      <Encabezado titulo="Empresas compradoras" descripcion={`${empresas.length} organizaciones registradas.`} />
      <div className="rounded-2xl border border-border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Empresa</TableHead>
              <TableHead className="hidden md:table-cell">Tipo</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Sedes</TableHead>
              <TableHead className="hidden text-right sm:table-cell">Pedidos</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Ahorro</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <p className="font-medium">{e.razonSocial}</p>
                  <p className="text-xs text-muted-foreground">
                    RUC {e.ruc} · {e.distrito} · desde {fecha(e.creadoEn)}
                  </p>
                </TableCell>
                <TableCell className="hidden md:table-cell">{tipo(e.tipo)}</TableCell>
                <TableCell>
                  <Badge variant={e.plan === "BASICO" ? "secondary" : "default"}>{e.plan === "BASICO" ? "Básico" : e.plan === "PRO" ? "Pro" : "Corporativo"}</Badge>
                </TableCell>
                <TableCell className="hidden text-right cifra sm:table-cell">{e._count.sedes}</TableCell>
                <TableCell className="hidden text-right cifra sm:table-cell">{e.numeroPedidos}</TableCell>
                <TableCell className="text-right cifra">{soles(e.gasto)}</TableCell>
                <TableCell className="hidden text-right text-amber-700 cifra dark:text-amber-300 lg:table-cell">{soles(e.ahorro)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
