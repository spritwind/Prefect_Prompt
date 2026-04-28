"use client";

import { QRShare } from "@/components/share/QRShare";
import { useToast } from "@/components/ui/Toast";
import { renderTemplate } from "@/lib/placeholders/render";
import type { PlaceholderSchema, PlaceholderValues } from "@/lib/placeholders/types";
import {
  type LocalPreset,
  getPresetsForPrompt,
  savePreset as savePresetLocal,
} from "@/lib/presets/local";
import { decodePresetValues, encodePresetValues } from "@/lib/share/url";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CopyButton } from "./CopyButton";
import { PlaceholderForm } from "./PlaceholderForm";
import { PresetSelector, type PresetSummary } from "./PresetSelector";
import { PreviewPane } from "./PreviewPane";

interface Props {
  promptId: string;
  slug: string;
  title: string;
  body: string;
  schema: Record<string, PlaceholderSchema>;
}

function defaultValues(schema: Record<string, PlaceholderSchema>): PlaceholderValues {
  const out: PlaceholderValues = {};
  for (const [k, s] of Object.entries(schema)) {
    if ("default" in s && s.default !== undefined) {
      out[k] = s.default as PlaceholderValues[string];
    }
  }
  return out;
}

function toSummary(p: LocalPreset): PresetSummary {
  return { id: p.id, name: p.name, values: p.values };
}

export function PromptDetailClient({ promptId, slug, title, body, schema }: Props) {
  const { show } = useToast();
  const searchParams = useSearchParams();
  const [values, setValues] = useState<PlaceholderValues>(() => defaultValues(schema));
  const [presets, setPresets] = useState<LocalPreset[]>([]);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // On mount: load presets + apply URL share param if present
  useEffect(() => {
    setPresets(getPresetsForPrompt(promptId));

    const token = searchParams.get("p");
    if (token) {
      const decoded = decodePresetValues(token);
      if (decoded) {
        setValues({ ...defaultValues(schema), ...decoded });
        show("✓ 已從分享連結載入");
      }
    }
    setHydrated(true);
  }, [promptId, searchParams, schema, show]);

  function selectPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setCurrentPresetId(id);
    setValues({ ...defaultValues(schema), ...p.values });
  }

  function savePreset() {
    const name = window.prompt("Preset 名稱?");
    if (!name) return;
    const created = savePresetLocal({ prompt_id: promptId, name, values });
    setPresets((arr) => [created, ...arr]);
    setCurrentPresetId(created.id);
    show(`✓ 已存 preset「${name}」`);
  }

  const rendered = renderTemplate(body, values);

  function logRecentUse() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "lastAction",
      JSON.stringify({
        promptId,
        slug,
        presetId: currentPresetId,
        values,
        title,
        rendered,
        ts: Date.now(),
      }),
    );

    // Also append to a recent list (cap 10)
    try {
      const raw = window.localStorage.getItem("recentList");
      const list = raw
        ? (JSON.parse(raw) as Array<{ slug: string; presetId: string | null; ts: number }>)
        : [];
      const filtered = list.filter((e) => !(e.slug === slug && e.presetId === currentPresetId));
      filtered.unshift({ slug, presetId: currentPresetId, ts: Date.now() });
      window.localStorage.setItem("recentList", JSON.stringify(filtered.slice(0, 10)));
    } catch {
      /* ignore */
    }
  }

  // Build share URL: current origin + slug-based path + ?p=<token>
  const shareUrl = (() => {
    if (typeof window === "undefined") return "";
    const token = encodePresetValues(values);
    return `${window.location.origin}/prompts/${slug}?p=${token}`;
  })();

  return (
    <main className="max-w-5xl mx-auto px-4 py-6 pb-32 flex flex-col gap-6">
      <header>
        <h1 className="font-mono text-xl">{title}</h1>
      </header>

      {hydrated && (
        <PresetSelector
          presets={presets.map(toSummary)}
          currentId={currentPresetId}
          onSelect={selectPreset}
          onNew={savePreset}
        />
      )}

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
        {hydrated && shareUrl && <QRShare url={shareUrl} />}
        <div className="flex-1">
          <CopyButton text={rendered} onCopied={logRecentUse} />
        </div>
      </div>
    </main>
  );
}
