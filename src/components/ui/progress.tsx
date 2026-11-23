"use client";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export function Progress({ className, value, indicadorClassName, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root> & { indicadorClassName?: string }) {
  return (
    <ProgressPrimitive.Root className={cn("relative h-2 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-all duration-500", indicadorClassName)}
        style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value ?? 0))}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}
