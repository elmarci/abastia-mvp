import type { Metadata } from "next";
import { Inbox } from "lucide-react";
import { Encabezado, EstadoVacio } from "@/components/app/encabezado";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { requerirPagina } from "@/lib/sesion";
import { fecha } from "@/lib/formato";

export const metadata: Metadata = { title: "Leads del piloto" };

export default async function LeadsAdmin() {
  await requerirPagina(["ADMIN"]);
  const leads = await prisma.lead.findMany({ orderBy: { creadoEn: "desc" } });
  return (
    <>
      <Encabezado titulo="Leads del piloto gratuito" descripcion="Solicitudes recibidas desde la página pública." />
      {leads.length === 0 ? (
        <EstadoVacio icono={<Inbox className="size-7" />} titulo="Aún no hay leads" />
      ) : (
        <div className="rounded-2xl border border-border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Contacto</TableHead>
                <TableHead>Organización</TableHead>
                <TableHead className="hidden md:table-cell">Tipo</TableHead>
                <TableHead className="hidden text-right sm:table-cell">Personas</TableHead>
                <TableHead className="hidden lg:table-cell">Fecha</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((l) => (
                <TableRow key={l.id} data-testid="fila-lead">
                  <TableCell>
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.email} {l.telefono && `· ${l.telefono}`}
                    </p>
                  </TableCell>
                  <TableCell>
                    {l.empresa}
                    {l.mensaje && <p className="max-w-xs truncate text-xs text-muted-foreground">{l.mensaje}</p>}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{l.tipo}</TableCell>
                  <TableCell className="hidden text-right cifra sm:table-cell">{l.personas ?? "—"}</TableCell>
                  <TableCell className="hidden text-muted-foreground lg:table-cell">{fecha(l.creadoEn)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
