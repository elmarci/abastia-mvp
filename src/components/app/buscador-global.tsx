"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { NAVEGACION } from "@/components/app/navegacion";
import type { RolUsuario } from "@/lib/permisos";

interface ResultadoProducto {
  id: string;
  nombre: string;
  emoji: string;
  categoria: string;
}

/** Buscador global con Ctrl+K: navega entre secciones y busca productos. */
export function BuscadorGlobal({ rol }: { rol: RolUsuario }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [texto, setTexto] = useState("");
  const [productos, setProductos] = useState<ResultadoProducto[]>([]);
  const buscaProductos = rol === "COMPRADOR" || rol === "APROBADOR" || rol === "MAYORISTA";

  useEffect(() => {
    function alPresionar(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setAbierto((v) => !v);
      }
    }
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, []);

  useEffect(() => {
    if (!buscaProductos || texto.trim().length < 2) {
      setProductos([]);
      return;
    }
    const control = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/catalogo?q=${encodeURIComponent(texto)}&limite=6`, { signal: control.signal })
        .then((r) => (r.ok ? r.json() : { productos: [] }))
        .then((d: { productos: ResultadoProducto[] }) => setProductos(d.productos))
        .catch(() => undefined);
    }, 180);
    return () => {
      clearTimeout(t);
      control.abort();
    };
  }, [texto, buscaProductos]);

  function ir(href: string) {
    setAbierto(false);
    setTexto("");
    router.push(href);
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex h-9 min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-muted sm:w-72"
        aria-label="Buscar (Ctrl+K)"
      >
        <Search className="size-4 shrink-0" />
        <span className="hidden truncate sm:inline">Buscar productos o secciones…</span>
        <kbd className="ml-auto hidden rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline">Ctrl K</kbd>
      </button>
      <DialogPrimitive.Root open={abierto} onOpenChange={setAbierto}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed left-1/2 top-[12vh] z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-popover shadow-2xl">
            <DialogPrimitive.Title className="sr-only">Buscador global</DialogPrimitive.Title>
            <Command shouldFilter={false} label="Buscador global" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground">
              <div className="flex items-center gap-2 border-b border-border px-4">
                <Search className="size-4 text-muted-foreground" />
                <Command.Input value={texto} onValueChange={setTexto} placeholder="Escribe para buscar…" className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
              </div>
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Sin resultados.</Command.Empty>
                {productos.length > 0 && (
                  <Command.Group heading="Productos">
                    {productos.map((p) => (
                      <Command.Item key={p.id} value={`p-${p.id}`} onSelect={() => ir(`/comprador/catalogo/${p.id}`)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
                        <span className="text-lg">{p.emoji}</span>
                        <span className="flex-1 truncate">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">{p.categoria}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
                <Command.Group heading="Ir a">
                  {NAVEGACION[rol]
                    .filter((i) => i.titulo.toLowerCase().includes(texto.toLowerCase()))
                    .map((i) => (
                      <Command.Item key={i.href} value={i.href} onSelect={() => ir(i.href)} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm data-[selected=true]:bg-muted">
                        <i.icono className="size-4 text-muted-foreground" />
                        {i.titulo}
                      </Command.Item>
                    ))}
                </Command.Group>
              </Command.List>
            </Command>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}
