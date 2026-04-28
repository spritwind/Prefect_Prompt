"use client";

import { CopyButton } from "@/components/prompt/CopyButton";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

function openCommandPalette() {
  window.dispatchEvent(new Event("open-command-palette"));
}

interface LastAction {
  promptId: string;
  slug: string;
  presetId: string | null;
  values: Record<string, unknown>;
  title: string;
  ts: number;
  rendered?: string;
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export function LastActionHero() {
  const [last, setLast] = useState<LastAction | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lastAction");
    if (!raw) return;
    try {
      setLast(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  if (!last) {
    return (
      <section className="text-center py-12 flex flex-col gap-3 items-center">
        <p className="font-mono text-fg/60">尚未使用任何 Prompt</p>
        <button
          type="button"
          onClick={openCommandPalette}
          className="font-mono text-sm text-bg bg-accent px-4 py-2 rounded-md hover:opacity-90"
        >
          🔍 瀏覽 Prompt
        </button>
        <p className="font-mono text-xs text-muted">桌機 Cmd/Ctrl+K · 手機下拉</p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 py-8">
      <Link href={`/prompts/${last.slug}` as Route} className="block">
        <p className="font-mono text-2xl">{last.title}</p>
        <p className="font-mono text-xs text-fg/60 mt-1">
          {last.promptId} · {formatAgo(last.ts)}
        </p>
      </Link>
      {last.rendered && <CopyButton text={last.rendered} />}
    </section>
  );
}
