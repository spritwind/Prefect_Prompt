"use client";

import { type LocalPreset, getAllPresets } from "@/lib/presets/local";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

interface RecentEntry {
  slug: string;
  presetId: string | null;
  ts: number;
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export function RecentList() {
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const [presets, setPresets] = useState<Record<string, LocalPreset>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("recentList");
      const list = raw ? (JSON.parse(raw) as RecentEntry[]) : [];
      setRecent(Array.isArray(list) ? list : []);
    } catch {
      setRecent([]);
    }
    const map: Record<string, LocalPreset> = {};
    for (const p of getAllPresets()) map[p.id] = p;
    setPresets(map);
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-mono text-fg/70 uppercase">Recent</h3>
      <ul className="flex flex-col gap-1">
        {recent.slice(0, 5).map((r) => {
          const p = r.presetId ? presets[r.presetId] : null;
          const label = p ? p.name : r.slug;
          return (
            <li key={`${r.slug}-${r.presetId}-${r.ts}`}>
              <Link
                href={`/prompts/${r.slug}` as Route}
                className="flex justify-between items-center px-3 py-2 rounded hover:bg-fg/5 font-mono text-sm"
              >
                <span className="truncate">{label}</span>
                <span className="text-xs text-muted shrink-0 ml-2">{formatAgo(r.ts)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
