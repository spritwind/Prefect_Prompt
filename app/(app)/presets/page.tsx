"use client";

import { Pencil, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

interface Preset {
  id: string;
  prompt_id: string;
  name: string;
  values: Record<string, unknown>;
  updated_at: string;
}

// TODO(R6): switch to localStorage
export default function PresetsPage() {
  const presets: Preset[] = [];

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
                disabled
                aria-label="Rename"
                className="p-2 text-muted hover:text-fg disabled:opacity-50"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                disabled
                aria-label="Delete"
                className="p-2 text-muted hover:text-red-400 disabled:opacity-50"
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
