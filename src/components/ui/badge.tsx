import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
  variants: {
    variant: {
      default: "border-transparent bg-primary/10 text-primary",
      secondary: "border-transparent bg-muted text-muted-foreground",
      ahorro: "border-transparent bg-accent/15 text-amber-700 dark:text-amber-300",
      exito: "border-transparent bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
      alerta: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300",
      peligro: "border-transparent bg-red-500/15 text-red-700 dark:text-red-300",
      info: "border-transparent bg-sky-500/15 text-sky-700 dark:text-sky-300",
      outline: "border-border text-foreground",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
