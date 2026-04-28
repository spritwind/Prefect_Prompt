"use client";

import { type LocalPreset, deletePreset, getAllPresets, updatePreset } from "@/lib/presets/local";
import { Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function PresetsPage() {
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPresets(getAllPresets());
    setHydrated(true);
  }, []);

  function rename(p: LocalPreset) {
    const name = window.prompt("新名稱", p.name);
    if (!name || name === p.name) return;
    const next = updatePreset(p.id, { name });
    if (next) setPresets((arr) => arr.map((x) => (x.id === p.id ? next : x)));
  }

  function remove(p: LocalPreset) {
    if (!window.confirm(`刪除 preset「${p.name}」?`)) return;
    if (deletePreset(p.id)) setPresets((arr) => arr.filter((x) => x.id !== p.id));
  }

  if (!hydrated) {
    return <main className="p-6 font-mono text-muted">Loading...</main>;
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="font-mono text-xl">My Presets</h1>
      {presets.length === 0 && <p className="text-muted font-mono text-sm">尚未建立任何 preset</p>}
      <ul className="flex flex-col gap-2">
        {presets.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between border border-fg/10 rounded p-3"
          >
            <div className="flex flex-col min-w-0">
              <Link
                href={`/prompts/${p.prompt_id}` as Route}
                className="font-mono text-sm truncate"
              >
                {p.name}
              </Link>
              <span className="text-xs text-muted truncate">{p.prompt_id}</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => rename(p)}
                aria-label="Rename"
                className="p-2 text-muted hover:text-fg"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(p)}
                aria-label="Delete"
                className="p-2 text-muted hover:text-red-400"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
