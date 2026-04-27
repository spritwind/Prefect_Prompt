"use client";

import { Field } from "@/components/ui/Field";
import type { PlaceholderSchema, PlaceholderValues } from "@/lib/placeholders/types";

interface Props {
  schema: Record<string, PlaceholderSchema>;
  values: PlaceholderValues;
  onChange: (next: PlaceholderValues) => void;
}

export function PlaceholderForm({ schema, values, onChange }: Props) {
  const set = (key: string, value: unknown) =>
    onChange({ ...values, [key]: value as PlaceholderValues[string] });

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(schema).map(([key, spec]) => (
        <Field key={key} label={spec.label} hint={spec.hint}>
          {renderControl(key, spec, values[key], set)}
        </Field>
      ))}
    </div>
  );
}

function renderControl(
  key: string,
  spec: PlaceholderSchema,
  value: unknown,
  set: (key: string, value: unknown) => void,
) {
  const baseClass =
    "bg-bg border border-fg/20 rounded px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none";

  switch (spec.type) {
    case "text":
      return (
        <input
          aria-label={spec.label}
          type="text"
          className={baseClass}
          value={(value as string) ?? spec.default ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      );
    case "multiline":
      return (
        <textarea
          aria-label={spec.label}
          className={`${baseClass} min-h-[120px] resize-y`}
          value={(value as string) ?? spec.default ?? ""}
          onChange={(e) => set(key, e.target.value)}
        />
      );
    case "number":
      return (
        <input
          aria-label={spec.label}
          type="number"
          className={baseClass}
          value={(value as number | undefined)?.toString() ?? spec.default?.toString() ?? ""}
          onChange={(e) => {
            const n = e.target.value === "" ? undefined : Number(e.target.value);
            set(key, n);
          }}
        />
      );
    case "select":
      return (
        <select
          aria-label={spec.label}
          className={baseClass}
          value={String((value as string | number | undefined) ?? spec.default ?? "")}
          onChange={(e) => {
            const opt = spec.options.find((o) => String(o) === e.target.value);
            set(key, opt);
          }}
        >
          {spec.options.map((o) => (
            <option key={String(o)} value={String(o)}>
              {String(o)}
            </option>
          ))}
        </select>
      );
    case "boolean":
      return (
        <input
          aria-label={spec.label}
          type="checkbox"
          className="size-5 accent-accent"
          checked={(value as boolean | undefined) ?? spec.default ?? false}
          onChange={(e) => set(key, e.target.checked)}
        />
      );
    default:
      return <span className="text-xs text-muted">(type "{spec.type}" not yet implemented)</span>;
  }
}
