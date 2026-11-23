import { cn } from "@/lib/utils";

/** Logo de AbastIA: canasta con una hoja. */
export function LogoIcono({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-8", className)} aria-hidden="true">
      <rect width="48" height="48" rx="12" fill="#1F7A4D" />
      <path d="M10 21h28l-3.2 14.2A3 3 0 0 1 31.9 38H16.1a3 3 0 0 1-2.9-2.8L10 21Z" fill="#fff" />
      <path d="M17 21l5-8M31 21l-5-8" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M24 34c0-5 3-8.5 8-9.5-.6 5.2-3.6 8.6-8 9.5Z" fill="#F2A93B" />
      <path d="M18.5 26.5v6M22.5 26.5v4" stroke="#1F7A4D" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, conTexto = true }: { className?: string; conTexto?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoIcono />
      {conTexto && (
        <span className="text-lg font-semibold tracking-tight">
          Abast<span className="text-primary">IA</span>
        </span>
      )}
    </span>
  );
}
