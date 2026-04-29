"use client";

import { useToast } from "@/components/ui/Toast";
import { useState } from "react";

const PLACEHOLDER_EXAMPLE = `{
  "PHASE_N": {
    "type": "number",
    "label": "Phase 編號",
    "default": 9,
    "hint": "8 / 9 / 10"
  }
}`;

export default function UploadPage() {
  const { show } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ path: string; commitUrl?: string } | null>(null);

  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [description, setDescription] = useState("");
  const [placeholdersRaw, setPlaceholdersRaw] = useState("");
  const [body, setBody] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    let placeholders: Record<string, unknown> = {};
    if (placeholdersRaw.trim()) {
      try {
        placeholders = JSON.parse(placeholdersRaw);
      } catch {
        show("⚠ Placeholders JSON 解析失敗");
        return;
      }
    }
    const tags = tagsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setSubmitting(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: id.trim(),
          title: title.trim(),
          category: category.trim().replace(/^\/+|\/+$/g, ""),
          tags,
          description: description.trim() || undefined,
          placeholders,
          body,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        show(`⚠ 上傳失敗：${data.error ?? "unknown"}`);
        return;
      }
      setSuccess({ path: data.path, commitUrl: data.commitUrl });
      show("✓ 已 commit 到 GitHub");
    } catch (err) {
      show(`⚠ 網路錯誤：${(err as Error).message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <h1 className="text-xl font-semibold">✓ Uploaded</h1>
        <p className="text-sm text-muted">
          新 prompt 已 commit 到 <code className="font-mono text-fg/80">{success.path}</code>。
          Vercel 會在 1-2 分鐘內 rebuild，之後它就會出現在 Library。
        </p>
        {success.commitUrl && (
          <a
            href={success.commitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-accent hover:underline w-fit"
          >
            查看 commit ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => {
            setSuccess(null);
            setId("");
            setTitle("");
            setCategory("");
            setTagsRaw("");
            setDescription("");
            setPlaceholdersRaw("");
            setBody("");
          }}
          className="bg-accent text-bg px-4 py-2 rounded-md font-mono text-sm w-fit"
        >
          再上傳一個
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">Upload new Prompt</h1>
        <p className="text-xs text-muted font-mono">
          直接 commit 到 GitHub repo · Vercel 自動 rebuild
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        <Field label="ID (kebab-case)" hint="例: factor-signal-test">
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="factor-signal-test"
            required
            pattern="^[a-z0-9][a-z0-9-]*$"
            maxLength={80}
            className={inputClass}
          />
        </Field>

        <Field label="Title">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="因子訊號測試 Prompt"
            required
            maxLength={200}
            className={inputClass}
          />
        </Field>

        <Field
          label="Category"
          hint="路徑格式: factor-research/test  (對應檔案會落在 prompts/<category>/<id>.md)"
        >
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="factor-research/test"
            required
            pattern="^[a-z0-9][a-z0-9/-]*[a-z0-9]$"
            maxLength={120}
            className={inputClass}
          />
        </Field>

        <Field label="Tags" hint="逗號分隔">
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="experimental, signal, mvp"
            maxLength={400}
            className={inputClass}
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="一句話描述這個 prompt 是做什麼的"
            maxLength={500}
            rows={2}
            className={`${inputClass} resize-y`}
          />
        </Field>

        <Field
          label="Placeholders (JSON, optional)"
          hint={`schema: { KEY: { type: 'text|number|select|boolean|multiline', label, default?, options? } }`}
        >
          <textarea
            value={placeholdersRaw}
            onChange={(e) => setPlaceholdersRaw(e.target.value)}
            placeholder={PLACEHOLDER_EXAMPLE}
            rows={8}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
        </Field>

        <Field label="Body (markdown)">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={"# 標題\n\nprompt 本文，用 {KEY} 引用 placeholder..."}
            required
            rows={14}
            maxLength={200_000}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="bg-accent text-bg px-6 py-3 rounded-lg font-medium hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "上傳中..." : "Upload to GitHub"}
        </button>
      </form>
    </main>
  );
}

const inputClass =
  "w-full bg-fg/[0.04] border border-fg/15 rounded-lg px-3 py-2 text-base focus:border-accent focus:bg-fg/[0.08] focus:outline-none transition";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-mono text-[11px] text-fg/60 uppercase tracking-widest">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted font-mono">{hint}</span>}
    </label>
  );
}
