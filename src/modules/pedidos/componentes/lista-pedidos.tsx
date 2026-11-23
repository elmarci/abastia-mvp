import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { fecha, soles } from "@/lib/formato";
import { EstadoBadge } from "@/modules/pedidos/componentes/estado";

export interface FilaPedido {
  id: string;
  codigo: string;
  creadoEn: Date;
  estado: string;
  total: unknown;
  ahorro: unknown;
  sede: { nombre: string } | null;
  subPedidos: { proveedor: { razonSocial: string } }[];
  creadoPor?: { nombre: string };
}

/** Lista de pedidos: tabla en escritorio y tarjetas en celular. */
export function ListaPedidos({ pedidos, base }: { pedidos: FilaPedido[]; base: string }) {
  return (
    <>
      <div className="hidden rounded-2xl border border-border bg-card shadow-sm md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Pedido</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Sede</TableHead>
              <TableHead>Proveedores</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Ahorro</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pedidos.map((p) => (
              <TableRow key={p.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`${base}/${p.id}`} className="hover:text-primary" data-testid="enlace-pedido">
                    {p.codigo}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{fecha(p.creadoEn)}</TableCell>
                <TableCell>{p.sede?.nombre ?? "Domicilio"}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground">{[...new Set(p.subPedidos.map((s) => s.proveedor.razonSocial.split(" ").slice(0, 2).join(" ")))].join(", ")}</TableCell>
                <TableCell className="text-right font-medium cifra">{soles(p.total as number)}</TableCell>
                <TableCell className="text-right text-amber-700 cifra dark:text-amber-300">{soles(p.ahorro as number)}</TableCell>
                <TableCell>
                  <EstadoBadge estado={p.estado} />
                </TableCell>
                <TableCell>
                  <Link href={`${base}/${p.id}`} aria-label={`Ver ${p.codigo}`}>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="space-y-3 md:hidden">
        {pedidos.map((p) => (
          <Link key={p.id} href={`${base}/${p.id}`} className="block rounded-2xl border border-border bg-card p-4 shadow-xs active:bg-muted">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">{p.codigo}</p>
              <EstadoBadge estado={p.estado} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {fecha(p.creadoEn)} · {p.sede?.nombre ?? "Domicilio"} · {p.subPedidos.length} proveedores
            </p>
            <div className="mt-3 flex items-end justify-between">
              <p className="text-lg font-semibold cifra">{soles(p.total as number)}</p>
              <p className="text-xs text-amber-700 cifra dark:text-amber-300">Ahorro {soles(p.ahorro as number)}</p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
