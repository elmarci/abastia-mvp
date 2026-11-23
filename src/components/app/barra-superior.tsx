"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useTheme } from "next-themes";
import { Bell, Check, LogOut, MapPin, Monitor, Moon, Sun, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/marca/logo";
import { BuscadorGlobal } from "@/components/app/buscador-global";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cambiarSede, cerrarSesion, marcarNotificacionesLeidas } from "@/modules/auth/acciones";
import { ETIQUETAS_ROL, type RolUsuario } from "@/lib/permisos";
import { fechaHora } from "@/lib/formato";
import { cn } from "@/lib/utils";

export interface DatosBarra {
  nombre: string;
  email: string;
  organizacion: string | null;
  sedes: { id: string; nombre: string }[];
  sedeActualId: string | null;
  notificaciones: { id: string; titulo: string; mensaje: string; enlace: string | null; leida: boolean; creadoEn: string }[];
  noLeidas: number;
  itemsCarrito: number;
}

export function BarraSuperior({ rol, datos }: { rol: RolUsuario; datos: DatosBarra }) {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const { setTheme, theme } = useTheme();

  function elegirSede(id: string) {
    iniciar(async () => {
      const r = await cambiarSede(id);
      if (r.ok) {
        toast.success("Sede actualizada");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function abrirNotificaciones(abierto: boolean) {
    if (!abierto && datos.noLeidas > 0) {
      iniciar(async () => {
        await marcarNotificacionesLeidas();
        router.refresh();
      });
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:gap-3 sm:px-6 lg:px-8">
      <Link href="/" className="lg:hidden" aria-label="Inicio">
        <Logo conTexto={false} />
      </Link>
      <BuscadorGlobal rol={rol} />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {datos.sedes.length > 0 && datos.sedeActualId && (
          <Select value={datos.sedeActualId} onValueChange={elegirSede} disabled={pendiente}>
            <SelectTrigger className="h-9 w-auto max-w-[44vw] gap-1.5 sm:max-w-56" aria-label="Sede activa">
              <MapPin className="size-4 shrink-0 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="min-w-52">
              {datos.sedes.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <DropdownMenu onOpenChange={abrirNotificaciones}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label={`Notificaciones (${datos.noLeidas} sin leer)`} data-testid="campana">
              <Bell className="size-[18px]" />
              {datos.noLeidas > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground cifra" data-testid="contador-notificaciones">
                  {datos.noLeidas > 9 ? "9+" : datos.noLeidas}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notificaciones</p>
              {datos.noLeidas > 0 && <span className="text-xs text-muted-foreground">{datos.noLeidas} sin leer</span>}
            </div>
            <div className="max-h-96 overflow-y-auto p-1">
              {datos.notificaciones.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No tienes notificaciones.</p>}
              {datos.notificaciones.map((n) => (
                <DropdownMenuItem key={n.id} asChild className="items-start">
                  <Link href={n.enlace ?? "#"} className="flex gap-3">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.leida ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{n.titulo}</span>
                      <span className="block text-xs text-muted-foreground">{n.mensaje}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{fechaHora(n.creadoEn)}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-1.5 sm:px-2" aria-label="Menú de usuario">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground">
                {datos.nombre.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left md:block">
                <span className="block max-w-36 truncate text-sm font-medium leading-tight">{datos.nombre}</span>
                <span className="block text-[11px] leading-tight text-muted-foreground">{ETIQUETAS_ROL[rol]}</span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <span className="block text-sm font-medium text-foreground">{datos.nombre}</span>
              <span className="block truncate">{datos.email}</span>
              {datos.organizacion && <span className="mt-1 block truncate text-foreground/80">{datos.organizacion}</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Tema</DropdownMenuLabel>
            {[
              ["light", "Claro", Sun],
              ["dark", "Oscuro", Moon],
              ["system", "Sistema", Monitor],
            ].map(([valor, texto, Icono]) => {
              const I = Icono as typeof Sun;
              return (
                <DropdownMenuItem key={valor as string} onSelect={() => setTheme(valor as string)}>
                  <I /> {texto as string}
                  {theme === valor && <Check className="ml-auto" />}
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/">
                <UserRound /> Ir a la página pública
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => iniciar(() => cerrarSesion())} data-testid="cerrar-sesion">
              <LogOut /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
