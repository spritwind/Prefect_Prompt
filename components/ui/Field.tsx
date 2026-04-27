import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is passed via children
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-mono text-fg/70">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
