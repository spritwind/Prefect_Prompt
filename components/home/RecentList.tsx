"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Recent {
  preset_id: string | null;
  prompt_id: string;
  used_at: string;
}
interface Preset {
  id: string;
  name: string;
  prompt_id: string;
}

export function RecentList() {
  const [recent, setRecent] = useState<Recent[]>([]);
  const [presets, setPresets] = useState<Record<string, Preset>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/recent-uses").then((r) => r.json()),
      fetch("/api/presets").then((r) => r.json()),
    ])
      .then(([rec, pre]) => {
        setRecent(rec.recent ?? []);
        const map: Record<string, Preset> = {};
        for (const p of pre.presets ?? []) map[p.id] = p;
        setPresets(map);
      })
      .catch(() => {});
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-mono text-fg/70 uppercase">Recent</h3>
      <ul className="flex flex-col gap-1">
        {recent.slice(0, 5).map((r, i) => {
          const p = r.preset_id ? presets[r.preset_id] : null;
          const label = p ? p.name : r.prompt_id;
          return (
            <li key={`${r.prompt_id}-${r.preset_id}-${i}`}>
              <Link
                href={`/prompts/${r.prompt_id}` as Route}
                className="flex justify-between items-center px-3 py-2 rounded hover:bg-fg/5 font-mono text-sm"
              >
                <span>{label}</span>
                <span className="text-xs text-muted">↗</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
