"use client";

import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";
import { Clipboard } from "lucide-react";
import { useState } from "react";

interface Props {
  text: string;
  onCopied?: () => void;
  variant?: "primary" | "secondary";
}

export function CopyButton({ text, onCopied, variant = "primary" }: Props) {
  const [flashing, setFlashing] = useState(false);
  const { show } = useToast();

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback for non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      navigator.vibrate?.(10);
      setFlashing(true);
      setTimeout(() => setFlashing(false), 220);
      show(`✓ 已複製 ${text.length.toLocaleString()} 字`);
      onCopied?.();
    } catch {
      show("⚠ 複製失敗，請手動長按");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "flex items-center justify-center gap-3 w-full rounded-xl font-mono font-medium transition-transform active:scale-95",
          variant === "primary"
            ? "bg-accent text-bg py-5 text-lg min-h-[64px]"
            : "bg-fg/10 text-fg py-3 text-sm",
        )}
        aria-label={`Copy (${text.length} 字)`}
      >
        <Clipboard className="size-5" />
        <span>📋 COPY ({text.length.toLocaleString()} 字)</span>
      </button>
      {flashing && (
        <div aria-hidden className="fixed inset-0 bg-accent/30 z-40 pointer-events-none" />
      )}
    </>
  );
}
