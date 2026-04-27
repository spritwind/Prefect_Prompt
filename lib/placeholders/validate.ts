import type { PlaceholderSchema, PlaceholderValues } from "./types";

export type ValidationResult =
  | { ok: true }
  | { ok: false; errors: Record<string, string> };

export function validateValues(
  schema: Record<string, PlaceholderSchema>,
  values: PlaceholderValues,
): ValidationResult {
  const errors: Record<string, string> = {};

  for (const [key, spec] of Object.entries(schema)) {
    const value = values[key];
    if (value === undefined || value === "") continue; // optional

    switch (spec.type) {
      case "number":
        if (typeof value !== "number" || Number.isNaN(value)) {
          errors[key] = `${key} must be a number`;
        }
        break;
      case "select": {
        const opts = spec.options.map(String);
        if (!opts.includes(String(value))) {
          errors[key] = `${key} must be one of options: ${opts.join(", ")}`;
        }
        break;
      }
      case "boolean":
        if (typeof value !== "boolean") errors[key] = `${key} must be boolean`;
        break;
      case "multiselect":
        if (!Array.isArray(value)) errors[key] = `${key} must be array`;
        break;
      case "text":
      case "multiline":
      case "date":
      case "code":
      case "file-ref":
        if (typeof value !== "string") errors[key] = `${key} must be string`;
        break;
      case "list":
        if (!Array.isArray(value) || value.some((v) => typeof v !== "string")) {
          errors[key] = `${key} must be array of strings`;
        }
        break;
    }
  }

  return Object.keys(errors).length === 0 ? { ok: true } : { ok: false, errors };
}
