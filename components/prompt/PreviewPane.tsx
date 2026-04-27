"use client";

import { extractPlaceholderKeys, renderTemplate } from "@/lib/placeholders/render";
import type { PlaceholderValues } from "@/lib/placeholders/types";
import { useMemo } from "react";

export function PreviewPane({
  template,
  values,
}: {
  template: string;
  values: PlaceholderValues;
}) {
  const rendered = useMemo(() => renderTemplate(template, values), [template, values]);
  const usedKeys = useMemo(() => extractPlaceholderKeys(template), [template]);
  const missing = usedKeys.filter((k) => values[k] === undefined || values[k] === "");

  return (
    <div className="flex flex-col gap-2">
      {missing.length > 0 && (
        <p className="text-xs font-mono text-yellow-400">
          未填: {missing.join(", ")}（會以 {"{"}原樣{"}"} 輸出）
        </p>
      )}
      <pre className="bg-fg/5 rounded p-4 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto">
        {rendered}
      </pre>
    </div>
  );
}
