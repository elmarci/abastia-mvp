"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { RegistroServiceWorker } from "@/components/app/registro-sw";

/** Proveedores de contexto globales: tema claro/oscuro, toasts y tooltips. */
export function Proveedores({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider delayDuration={200}>
        {children}
        <Toaster richColors position="top-right" closeButton toastOptions={{ className: "rounded-xl" }} />
        <RegistroServiceWorker />
      </TooltipProvider>
    </ThemeProvider>
  );
}
