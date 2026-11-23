"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo, LogoIcono } from "@/components/marca/logo";
import { NAVEGACION, type ItemNav } from "@/components/app/navegacion";
import { BarraSuperior, type DatosBarra } from "@/components/app/barra-superior";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { RolUsuario } from "@/lib/permisos";

function activo(ruta: string, item: ItemNav, items: ItemNav[]) {
  if (ruta === item.href) return true;
  // Activa el ítem más específico que coincida con la ruta
  const coincidencias = items.filter((i) => ruta === i.href || ruta.startsWith(`${i.href}/`));
  const masLargo = coincidencias.sort((a, b) => b.href.length - a.href.length)[0];
  return masLargo?.href === item.href;
}

export function Shell({ rol, datos, children }: { rol: RolUsuario; datos: DatosBarra; children: React.ReactNode }) {
  const ruta = usePathname();
  const items = NAVEGACION[rol];
  const [colapsada, setColapsada] = useState(false);

  useEffect(() => {
    try {
      setColapsada(localStorage.getItem("abastia_sidebar") === "1");
    } catch {
      // Sin almacenamiento local: se usa la barra expandida
    }
  }, []);

  function alternar() {
    setColapsada((v) => {
      try {
        localStorage.setItem("abastia_sidebar", v ? "0" : "1");
      } catch {
        // Ignorado
      }
      return !v;
    });
  }

  const grupos: { nombre: string | undefined; items: ItemNav[] }[] = [];
  for (const item of items) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.nombre === item.grupo) ultimo.items.push(item);
    else grupos.push({ nombre: item.grupo, items: [item] });
  }

  return (
    <div className="flex min-h-dvh">
      {/* Barra lateral (escritorio) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar transition-[width] duration-200 lg:flex",
          colapsada ? "w-[72px]" : "w-64",
        )}
      >
        <div className={cn("flex h-16 items-center border-b border-border px-4", colapsada && "justify-center px-0")}>
          <Link href="/" aria-label="AbastIA, ir al inicio">
            {colapsada ? <LogoIcono /> : <Logo />}
          </Link>
        </div>
        <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="Navegación principal">
          {grupos.map((g, i) => (
            <div key={i} className="space-y-1">
              {g.nombre && !colapsada && <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{g.nombre}</p>}
              {g.items.map((item) => {
                const esActivo = activo(ruta, item, items);
                const enlace = (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={esActivo ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      esActivo && "bg-secondary text-secondary-foreground hover:bg-secondary",
                      colapsada && "justify-center px-0",
                    )}
                  >
                    <item.icono className="size-[18px] shrink-0" />
                    {!colapsada && <span className="truncate">{item.titulo}</span>}
                    {!colapsada && item.href === "/comprador/carrito" && datos.itemsCarrito > 0 && (
                      <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground cifra">{datos.itemsCarrito}</span>
                    )}
                  </Link>
                );
                return colapsada ? (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>{enlace}</TooltipTrigger>
                    <TooltipContent side="right">{item.titulo}</TooltipContent>
                  </Tooltip>
                ) : (
                  enlace
                );
              })}
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <button
            onClick={alternar}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted", colapsada && "justify-center px-0")}
            aria-label={colapsada ? "Expandir barra lateral" : "Colapsar barra lateral"}
          >
            {colapsada ? <PanelLeftOpen className="size-[18px]" /> : <PanelLeftClose className="size-[18px]" />}
            {!colapsada && "Colapsar"}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior rol={rol} datos={datos} />
        <main id="contenido" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-safe sm:px-6 lg:px-8 lg:pb-10">
          {children}
        </main>
      </div>

      {/* Navegación inferior (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Navegación inferior">
        <ul className="mx-auto flex max-w-lg justify-around">
          {items
            .filter((i) => i.movil)
            .slice(0, 5)
            .map((item) => {
              const esActivo = activo(ruta, item, items);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={esActivo ? "page" : undefined}
                    className={cn("relative flex flex-col items-center gap-0.5 px-1 py-2 text-[10.5px] font-medium text-muted-foreground", esActivo && "text-primary")}
                  >
                    <item.icono className="size-5" />
                    <span className="max-w-full truncate">{item.titulo.split(" ")[0]}</span>
                    {item.href === "/comprador/carrito" && datos.itemsCarrito > 0 && (
                      <span className="absolute right-[22%] top-1 min-w-4 rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground cifra">{datos.itemsCarrito}</span>
                    )}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
