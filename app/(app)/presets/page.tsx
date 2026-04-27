"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Preset {
  id: string;
  prompt_id: string;
  name: string;
  values: Record<string, unknown>;
  updated_at: string;
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => {
        setPresets(d.presets ?? []);
        setLoading(false);
      });
  }, []);

  async function rename(p: Preset) {
    const name = window.prompt("新名稱", p.name);
    if (!name || name === p.name) return;
    const res = await fetch(`/api/presets/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) setPresets((arr) => arr.map((x) => (x.id === p.id ? { ...x, name } : x)));
  }

  async function remove(p: Preset) {
    if (!window.confirm(`刪除 preset「${p.name}」?`)) return;
    const res = await fetch(`/api/presets/${p.id}`, { method: "DELETE" });
    if (res.ok) setPresets((arr) => arr.filter((x) => x.id !== p.id));
  }

  if (loading) return <main className="p-6 font-mono text-muted">Loading...</main>;

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
            <div className="flex flex-col">
              <Link href={`/prompts/${p.prompt_id}` as Route} className="font-mono text-sm">
                {p.name}
              </Link>
              <span className="text-xs text-muted">{p.prompt_id}</span>
            </div>
            <div className="flex gap-2">
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
