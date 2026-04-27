import type { PlaceholderValues } from "./types";

const ESCAPED_OPEN = " ESC_OPEN ";
const ESCAPED_CLOSE = " ESC_CLOSE ";

function stringify(value: unknown): string {
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.join(", ");
  if (value === undefined || value === null) return "";
  return String(value);
}

export function renderTemplate(template: string, values: PlaceholderValues): string {
  // 1. Protect escaped braces
  const protectedTpl = template
    .replaceAll("\\{", ESCAPED_OPEN)
    .replaceAll("\\}", ESCAPED_CLOSE);

  // 2. Substitute {KEY} where KEY exists in values
  const substituted = protectedTpl.replace(/\{([A-Z][A-Z0-9_]*)\}/g, (match, key) => {
    if (key in values && values[key] !== undefined) {
      return stringify(values[key]);
    }
    return match;
  });

  // 3. Restore escaped braces
  return substituted.replaceAll(ESCAPED_OPEN, "{").replaceAll(ESCAPED_CLOSE, "}");
}

export function extractPlaceholderKeys(template: string): string[] {
  const cleaned = template.replaceAll("\\{", "").replaceAll("\\}", "");
  const matches = cleaned.matchAll(/\{([A-Z][A-Z0-9_]*)\}/g);
  return Array.from(new Set(Array.from(matches, (m) => m[1])));
}
