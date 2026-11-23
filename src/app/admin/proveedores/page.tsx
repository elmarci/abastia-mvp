import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { Encabezado } from "@/components/app/encabezado";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requerirPagina } from "@/lib/sesion";
import { fecha, num } from "@/lib/formato";
import { listarProveedores } from "@/modules/admin/consultas";
import { AccionesProveedor } from "@/modules/admin/componentes/acciones-proveedor";

export const metadata: Metadata = { title: "Proveedores" };

export default async function ProveedoresAdmin() {
  await requerirPagina(["ADMIN"]);
  const proveedores = await listarProveedores();
  return (
    <>
      <Encabezado titulo="Homologación de proveedores" descripcion="Revisa documentos, aprueba o suspende proveedores y configura su comisión (5 % a 8 %)." />
      <div className="space-y-3">
        {proveedores.map((p) => (
          <Card key={p.id} data-testid={`proveedor-${p.ruc}`}>
            <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{p.razonSocial}</p>
                  <Badge variant={p.estado === "HOMOLOGADO" ? "exito" : p.estado === "PENDIENTE" ? "alerta" : "peligro"} data-testid="estado-proveedor">
                    {p.estado === "HOMOLOGADO" ? "Homologado" : p.estado === "PENDIENTE" ? "Pendiente de homologación" : "Suspendido"}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  RUC {p.ruc} · {p.tipo} · {p.categorias.join(", ")} · reparto: {p.zonaReparto.join(", ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {p.contacto} · {p.usuarios[0]?.email} · {p._count.ofertas} ofertas · {p._count.subPedidos} pedidos · registrado {fecha(p.creadoEn)} · calificación {num(p.calificacion).toFixed(1)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.documentos.map((d) => (
                    <Badge key={d} variant="outline">
                      <FileText className="size-3" /> {d}
                    </Badge>
                  ))}
                </div>
              </div>
              <AccionesProveedor id={p.id} estado={p.estado} comision={num(p.comision)} />
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
