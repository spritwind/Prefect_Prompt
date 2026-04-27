"use client";

import { useToast } from "@/components/ui/Toast";
import { renderTemplate } from "@/lib/placeholders/render";
import type { PlaceholderSchema, PlaceholderValues } from "@/lib/placeholders/types";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { PlaceholderForm } from "./PlaceholderForm";
import { PresetSelector, type PresetSummary } from "./PresetSelector";
import { PreviewPane } from "./PreviewPane";

interface Props {
  promptId: string;
  title: string;
  body: string;
  schema: Record<string, PlaceholderSchema>;
}

function defaultValues(schema: Record<string, PlaceholderSchema>): PlaceholderValues {
  const out: PlaceholderValues = {};
  for (const [k, s] of Object.entries(schema)) {
    if ("default" in s && s.default !== undefined) out[k] = s.default as never;
  }
  return out;
}

export function PromptDetailClient({ promptId, title, body, schema }: Props) {
  const { show } = useToast();
  const [values, setValues] = useState<PlaceholderValues>(() => defaultValues(schema));
  const [presets, setPresets] = useState<PresetSummary[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/presets")
      .then((r) => r.json())
      .then((d) => {
        const all = (d.presets ?? []) as Array<PresetSummary & { prompt_id: string }>;
        setPresets(all.filter((p) => p.prompt_id === promptId));
      })
      .catch(() => {});
  }, [promptId]);

  function selectPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setCurrentPresetId(id);
    setValues({ ...defaultValues(schema), ...p.values });
  }

  async function savePreset() {
    const name = window.prompt("Preset 名稱?");
    if (!name) return;
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId, name, values }),
    });
    if (!res.ok) {
      show("⚠ 儲存失敗");
      return;
    }
    const { preset } = await res.json();
    setPresets((p) => [{ id: preset.id, name: preset.name, values: preset.values }, ...p]);
    setCurrentPresetId(preset.id);
    show(`✓ 已存 preset「${name}」`);
  }

  const rendered = renderTemplate(body, values);

  function logRecentUse() {
    fetch("/api/recent-uses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId, preset_id: currentPresetId }),
    }).catch(() => {});
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "lastAction",
        JSON.stringify({
          promptId,
          presetId: currentPresetId,
          values,
          title,
          rendered,
          ts: Date.now(),
        }),
      );
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-32 flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-xl">{title}</h1>
      </header>
      <PresetSelector
        presets={presets}
        currentId={currentPresetId}
        onSelect={selectPreset}
        onNew={savePreset}
      />
      <section>
        <h3 className="text-xs font-mono text-fg/70 uppercase mb-2">Variables</h3>
        <PlaceholderForm schema={schema} values={values} onChange={setValues} />
      </section>
      <details>
        <summary className="text-xs font-mono text-fg/70 uppercase cursor-pointer">Preview</summary>
        <div className="mt-2">
          <PreviewPane template={body} values={values} />
        </div>
      </details>
      <div
        className="fixed bottom-0 inset-x-0 bg-bg/95 backdrop-blur border-t border-fg/10 p-4 flex gap-2 max-w-5xl mx-auto"
        style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={savePreset}
          className="bg-fg/10 text-fg px-4 py-3 rounded-md font-mono text-sm"
        >
          💾 Save
        </button>
        <div className="flex-1">
          <CopyButton text={rendered} onCopied={logRecentUse} />
        </div>
      </div>
    </main>
  );
}
