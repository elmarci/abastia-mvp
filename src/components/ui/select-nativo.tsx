import * as React from "react";
import { cn } from "@/lib/utils";

/** Select nativo con el estilo de los campos (útil en celulares y listas largas). */
export function SelectNativo({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
