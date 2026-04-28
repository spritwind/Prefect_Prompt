import type { PlaceholderValues } from "@/lib/placeholders/types";

// Base64-URL-safe (RFC 4648 §5) — no padding, +/ → -_
function base64UrlEncode(s: string): string {
  if (typeof window !== "undefined" && typeof window.btoa === "function") {
    return window
      .btoa(unescape(encodeURIComponent(s)))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  }
  return Buffer.from(s, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecode(s: string): string {
  const padded = s.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((s.length + 3) % 4);
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return decodeURIComponent(escape(window.atob(padded)));
  }
  return Buffer.from(padded, "base64").toString("utf8");
}

export function encodePresetValues(values: PlaceholderValues): string {
  return base64UrlEncode(JSON.stringify(values));
}

export function decodePresetValues(token: string): PlaceholderValues | null {
  try {
    const json = base64UrlDecode(token);
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as PlaceholderValues;
    }
    return null;
  } catch {
    return null;
  }
}
