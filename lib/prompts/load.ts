import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parsePrompt } from "./parse";
import type { PromptDoc } from "./types";

const PROMPTS_ROOT = path.join(process.cwd(), "prompts");

function walk(dir: string): string[] {
  const entries: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) entries.push(...walk(full));
    else if (name.endsWith(".md")) entries.push(full);
  }
  return entries;
}

export function loadAllPrompts(): PromptDoc[] {
  const files = walk(PROMPTS_ROOT);
  return files.map((file) => {
    const raw = readFileSync(file, "utf8");
    const relPath = path.relative(process.cwd(), file).replaceAll("\\", "/");
    return parsePrompt(raw, relPath);
  });
}

export function loadPromptById(id: string): PromptDoc | undefined {
  return loadAllPrompts().find((p) => p.id === id);
}
