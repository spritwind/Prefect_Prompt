"use client";

import type { PlaceholderValues } from "@/lib/placeholders/types";

export interface PresetSummary {
  id: string;
  name: string;
  values: PlaceholderValues;
}

export function PresetSelector({
  presets,
  currentId,
  onSelect,
  onNew,
}: {
  presets: PresetSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  if (presets.length === 0) {
    return (
      <button type="button" onClick={onNew} className="text-sm font-mono text-accent">
        + 建立第一個 Preset
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-fg/70 uppercase">Preset ({presets.length})</h3>
        <button type="button" onClick={onNew} className="text-xs font-mono text-accent">
          + New
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {presets.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`text-left px-3 py-2 rounded font-mono text-sm border ${
              p.id === currentId ? "border-accent bg-accent/10" : "border-fg/10 hover:border-fg/30"
            }`}
          >
            {p.id === currentId ? "◉ " : "○ "}
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
