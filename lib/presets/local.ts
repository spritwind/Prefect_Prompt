"use client";

import type { PlaceholderValues } from "@/lib/placeholders/types";

const STORAGE_KEY = "promptHub.presets";

export interface LocalPreset {
  id: string;
  prompt_id: string;
  name: string;
  values: PlaceholderValues;
  created_at: number;
  updated_at: number;
}

function readAll(): LocalPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(presets: LocalPreset[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getPresetsForPrompt(promptId: string): LocalPreset[] {
  return readAll()
    .filter((p) => p.prompt_id === promptId)
    .sort((a, b) => b.updated_at - a.updated_at);
}

export function getAllPresets(): LocalPreset[] {
  return readAll().sort((a, b) => b.updated_at - a.updated_at);
}

export function savePreset(input: {
  prompt_id: string;
  name: string;
  values: PlaceholderValues;
}): LocalPreset {
  const all = readAll();
  const now = Date.now();
  const preset: LocalPreset = {
    id: genId(),
    prompt_id: input.prompt_id,
    name: input.name,
    values: input.values,
    created_at: now,
    updated_at: now,
  };
  writeAll([preset, ...all]);
  return preset;
}

export function updatePreset(
  id: string,
  patch: Partial<Pick<LocalPreset, "name" | "values">>,
): LocalPreset | null {
  const all = readAll();
  const idx = all.findIndex((p) => p.id === id);
  if (idx < 0) return null;
  const next: LocalPreset = { ...all[idx], ...patch, updated_at: Date.now() };
  all[idx] = next;
  writeAll(all);
  return next;
}

export function deletePreset(id: string): boolean {
  const all = readAll();
  const filtered = all.filter((p) => p.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
