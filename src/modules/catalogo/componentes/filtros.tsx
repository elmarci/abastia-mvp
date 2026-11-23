"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export function FiltrosCatalogo({ categorias }: { categorias: { slug: string; nombre: string; icono: string }[] }) {
  const router = useRouter();
  const ruta = usePathname();
  const params = useSearchParams();
  const [pendiente, iniciar] = useTransition();
  const [texto, setTexto] = useState(params.get("q") ?? "");
  const categoria = params.get("categoria") ?? "";
  const orden = params.get("orden") ?? "relevancia";

  function actualizar(cambios: Record<string, string>) {
    const nuevo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(cambios)) {
      if (v) nuevo.set(k, v);
      else nuevo.delete(k);
    }
    iniciar(() => router.replace(`${ruta}?${nuevo.toString()}`, { scroll: false }));
  }

  useEffect(() => {
    if (texto === (params.get("q") ?? "")) return;
    const t = setTimeout(() => actualizar({ q: texto }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto]);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar arroz, café, papel toalla…" className="pl-9 pr-9" aria-label="Buscar productos" data-testid="buscar-catalogo" />
          {pendiente ? (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : (
            texto && (
              <button onClick={() => setTexto("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground" aria-label="Limpiar búsqueda">
                <X className="size-4" />
              </button>
            )
          )}
        </div>
        <Select value={orden} onValueChange={(v) => actualizar({ orden: v === "relevancia" ? "" : v })}>
          <SelectTrigger className="sm:w-52" aria-label="Ordenar por">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="relevancia">Orden: categoría</SelectItem>
            <SelectItem value="precio-asc">Precio: menor a mayor</SelectItem>
            <SelectItem value="precio-desc">Precio: mayor a menor</SelectItem>
            <SelectItem value="ahorro">Mayor ahorro</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtrar por categoría">
        {[{ slug: "", nombre: "Todas", icono: "✨" }, ...categorias].map((c) => (
          <button
            key={c.slug || "todas"}
            onClick={() => actualizar({ categoria: c.slug })}
            aria-pressed={categoria === c.slug}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors duration-150 hover:bg-muted",
              categoria === c.slug && "border-primary bg-primary text-primary-foreground hover:bg-primary/90",
            )}
          >
            <span aria-hidden>{c.icono}</span>
            {c.nombre}
          </button>
        ))}
      </div>
    </div>
  );
}
