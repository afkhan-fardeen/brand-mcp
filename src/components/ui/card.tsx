import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// Elevation comes from a surface-color shift + hairline border, never a shadow.
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-hairline bg-surface-raised p-6",
        className,
      )}
      {...props}
    />
  );
}
