# Prompt Hub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Vercel-hosted, mobile-first prompt management web app where prompts live in this Git repo (SSOT), presets live in Supabase Postgres, and the core mobile flow is "1-tap copy of last-used preset" in under 2 seconds.

**Architecture:** Next.js 15 App Router on Vercel reads prompt MDs from this repo at build time (via Octokit) and re-renders via ISR on push. Supabase provides Auth (GitHub OAuth + allowlist) and Postgres (presets + recent_uses with RLS). Mobile UX is a "Last Action" hero with sticky giant copy button; pull-to-search opens a command palette backed by a build-time MiniSearch index served as a static asset.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Geist font, Radix UI, @supabase/ssr, gray-matter, MiniSearch, Lucide React, Vitest, Playwright, Biome, pnpm.

**Spec:** `docs/superpowers/specs/2026-04-27-prompt-hub-design.md`

---

## File Structure (locked in before tasks)

```
Prefect_Prompt/
├── prompts/                              # SSOT content
│   └── factor-research/
│       ├── brainstorm/factor-brainstorm-parallel.md
│       └── backtest/{entry,exit}-factor-backtest.md
├── app/
│   ├── layout.tsx                         # root layout, fonts, theme
│   ├── globals.css
│   ├── middleware.ts                      # auth + allowlist
│   ├── (auth)/login/page.tsx
│   ├── (auth)/auth/callback/route.ts
│   ├── (app)/layout.tsx                   # auth-required wrapper
│   ├── (app)/page.tsx                     # Home: Last Action hero
│   ├── (app)/prompts/[...slug]/page.tsx
│   ├── (app)/presets/page.tsx
│   ├── (app)/settings/page.tsx
│   └── api/
│       ├── presets/route.ts               # POST/GET
│       ├── presets/[id]/route.ts          # PATCH/DELETE
│       └── recent-uses/route.ts           # POST (fire-and-forget)
├── components/
│   ├── home/LastActionHero.tsx
│   ├── home/RecentList.tsx
│   ├── prompt/PlaceholderForm.tsx
│   ├── prompt/PreviewPane.tsx
│   ├── prompt/CopyButton.tsx
│   ├── prompt/PresetSelector.tsx
│   ├── command-palette/CommandPalette.tsx
│   ├── command-palette/PullToSearchHint.tsx
│   └── ui/{Sheet,Dialog,Toast,Toggle}.tsx
├── lib/
│   ├── placeholders/
│   │   ├── types.ts                       # discriminated union
│   │   ├── registry.ts                    # type registry pattern
│   │   ├── render.ts                      # template substitution
│   │   └── validate.ts
│   ├── github.ts                          # Octokit fetch helpers (build-time)
│   ├── prompts/
│   │   ├── parse.ts                       # gray-matter + schema
│   │   ├── load.ts                        # filesystem loader (build-time)
│   │   └── types.ts                       # PromptDoc type
│   ├── supabase/
│   │   ├── server.ts                      # @supabase/ssr server client
│   │   ├── client.ts                      # browser client
│   │   └── middleware.ts                  # session refresh helper
│   ├── auth/
│   │   └── allowlist.ts
│   └── search/
│       ├── build.ts                       # build-time index gen
│       └── client.ts                      # runtime lazy load
├── scripts/
│   ├── validate-prompts.ts                # pre-build validator
│   ├── build-search-index.ts              # pre-build index gen
│   └── migrate-existing-prompts.ts        # one-shot migration
├── public/
│   ├── search/index.json                  # generated
│   ├── manifest.json                      # PWA
│   └── icons/{192,512,apple-touch}.png
├── supabase/
│   └── migrations/0001_init.sql
├── tests/
│   ├── unit/                              # Vitest
│   └── e2e/                               # Playwright
├── docs/superpowers/{specs,plans}/
├── package.json
├── next.config.ts
├── tsconfig.json
├── biome.json
├── tailwind.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── .env.example
└── README.md
```

Each file has a single responsibility. `lib/placeholders/` is the most-touched module across tasks; isolating types/registry/render/validate keeps each file small.

---

## Pre-Flight: Repo Layout Migration

**Why first:** existing `01_*.md`, `02_*.md`, `03_*.md` are at repo root. We need them under `prompts/factor-research/...` with frontmatter before Task 1 can validate them. This pre-flight does not need code, just `git mv` + frontmatter additions, but lives as Task 0 to make it commit-able and reviewable.

### Task 0: Migrate Existing Prompts to New Layout

**Files:**
- Move: `01_因子發想-多Agent平行Prompt.md` → `prompts/factor-research/brainstorm/factor-brainstorm-parallel.md`
- Move: `02_因子回測-Entry入場因子Prompt.md` → `prompts/factor-research/backtest/entry-factor-backtest.md`
- Move: `03_因子回測-Exit提前出場因子Prompt.md` → `prompts/factor-research/backtest/exit-factor-backtest.md`
- Modify: `README.md` (update path table)

- [ ] **Step 1: Create target directories**

```bash
cd C:/Users/User/SideProject/Prefect_Prompt
mkdir -p prompts/factor-research/brainstorm
mkdir -p prompts/factor-research/backtest
```

- [ ] **Step 2: git mv the three files**

```bash
git mv "01_因子發想-多Agent平行Prompt.md" prompts/factor-research/brainstorm/factor-brainstorm-parallel.md
git mv "02_因子回測-Entry入場因子Prompt.md" prompts/factor-research/backtest/entry-factor-backtest.md
git mv "03_因子回測-Exit提前出場因子Prompt.md" prompts/factor-research/backtest/exit-factor-backtest.md
```

- [ ] **Step 3: Add frontmatter to brainstorm prompt**

Prepend to `prompts/factor-research/brainstorm/factor-brainstorm-parallel.md`:

```yaml
---
id: factor-brainstorm-parallel
title: 因子發想-多Agent平行Prompt
category: factor-research/brainstorm
tags: [production, parallel-agent, brainstorm]
description: 8 大 lane 平行廣度發想 candidate factors
estimated_time: "60-120 min/agent"
agent_count: "6-8 (parallel)"
placeholders:
  PHASE_N:
    type: number
    label: Phase 編號
    default: 9
    hint: "8 / 9 / 10"
  LANE_X:
    type: select
    label: Lane 編號
    options: [1, 2, 3, 4, 5, 6, 7, 8]
  LANE_NAME:
    type: select
    label: Lane 名稱
    options: [法人面, 籌碼-分點, 基本面財務, 技術面動能, 微結構, 總體產業, 事件, 跨母體]
  TIME_BUDGET_MIN:
    type: number
    label: 時間預算 (分鐘)
    default: 90
    hint: "大 lane 90 / 小 lane 60"
  N_FACTORS_TARGET:
    type: number
    label: final 因子數
    default: 20
    hint: "大 lane 20 / 小 lane 10 (整體 < 30)"
---

```

- [ ] **Step 4: Add frontmatter to entry backtest prompt**

Prepend to `prompts/factor-research/backtest/entry-factor-backtest.md`:

```yaml
---
id: entry-factor-backtest
title: 因子回測-Entry入場因子Prompt
category: factor-research/backtest
tags: [production, backtest, entry]
description: T+2 進場一般因子 5 層 QA 嚴謹回測
estimated_time: "4-8 hr"
agent_count: "4 (3 Test + 1 Integrator)"
placeholders:
  PHASE_N:
    type: text
    label: Phase 編號
    default: "9"
    hint: "8.2 / 9 / 10"
  N_TEST_AGENTS:
    type: number
    label: 測試 agent 數
    default: 3
    hint: "3-5"
  AGENT_X:
    type: select
    label: Agent 編號
    options: [A, B, C, D, E]
  AGENT_NAME:
    type: select
    label: Agent 名稱
    options: [5min 測試員, 20min 測試員, 跨母體測試員]
  INTERVAL:
    type: select
    label: 母體
    options: [5, 20, cross]
  TIME_BUDGET_HR:
    type: number
    label: 時間預算 (小時)
    default: 5
    hint: "4-6 hr"
  N_FACTORS_TO_TEST:
    type: number
    label: 預期測試數
    default: 50
    hint: "30-80"
  BRAINSTORM_INPUT:
    type: text
    label: brainstorm output 路徑
    default: "scripts/phase{PHASE_N}_brainstorm_*.json"
---

```

- [ ] **Step 5: Add frontmatter to exit backtest prompt**

Prepend to `prompts/factor-research/backtest/exit-factor-backtest.md`:

```yaml
---
id: exit-factor-backtest
title: 因子回測-Exit提前出場因子Prompt
category: factor-research/backtest
tags: [production, backtest, exit]
description: T+N 提前出場因子 7 層 QA (含 L6/L7 動態 normalize)
estimated_time: "6-8 hr"
agent_count: "4 (3 Test + 1 Integrator)"
placeholders:
  AGENT_X:
    type: select
    label: Agent 編號
    options: [P9_A, P9_B, P9_C]
  AGENT_NAME:
    type: select
    label: Agent 名稱
    options: [Tier1 R counter, Tier2 macro, Tier3 個股]
  TIME_BUDGET_HR:
    type: number
    label: 時間預算 (小時)
    default: 8
    hint: "8 hr"
---

```

- [ ] **Step 6: Update README path table**

Edit `README.md`, replace the file table:

```markdown
| 檔案 | 用途 | 派 agent 數 | 預計時間 |
|------|------|------------|----------|
| **prompts/factor-research/brainstorm/factor-brainstorm-parallel.md** | 8 大 lane 平行廣度發想 | 6-8 (parallel) | 60-120 min/agent |
| **prompts/factor-research/backtest/entry-factor-backtest.md** | T+2 進場 5 層 QA 回測 | 4 | 4-8 hr |
| **prompts/factor-research/backtest/exit-factor-backtest.md** | T+N 提前出場 7 層 QA 回測 | 4 | 6-8 hr |
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: relocate prompts to prompts/<category>/ with frontmatter

Prep for Prompt Hub web app build (spec 2026-04-27-prompt-hub-design).
- Moved 3 root-level *.md to prompts/factor-research/{brainstorm,backtest}/
- Added YAML frontmatter (id, title, category, tags, placeholders schema)
- Updated README path table"
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `biome.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `app/layout.tsx`
- Create: `app/globals.css`
- Create: `app/(app)/page.tsx` (placeholder home)
- Create: `.env.example`
- Create: `.gitignore` (extend)
- Create: `vitest.config.ts`

- [ ] **Step 1: Initialize pnpm + Next.js manually (avoid create-next-app interactivity)**

Create `package.json`:

```json
{
  "name": "prompt-hub",
  "private": true,
  "version": "0.1.0",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "dev": "next dev",
    "build": "pnpm run validate:prompts && pnpm run build:search && next build",
    "start": "next start",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "validate:prompts": "tsx scripts/validate-prompts.ts",
    "build:search": "tsx scripts/build-search-index.ts"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "@supabase/ssr": "^0.5.2",
    "@supabase/supabase-js": "^2.46.1",
    "gray-matter": "^4.0.3",
    "minisearch": "^7.1.0",
    "lucide-react": "^0.460.0",
    "@radix-ui/react-dialog": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-switch": "^1.1.1",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "geist": "^1.3.1",
    "zod": "^3.23.8",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.4"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.4",
    "@playwright/test": "^1.48.2",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "tsx": "^4.19.2",
    "typescript": "^5.6.3",
    "tailwindcss": "^4.0.0-beta.5",
    "@tailwindcss/postcss": "^4.0.0-beta.5",
    "postcss": "^8.4.49",
    "vitest": "^2.1.5",
    "jsdom": "^25.0.1"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create next.config.ts**

```ts
import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
};

export default config;
```

- [ ] **Step 4: Create biome.json**

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "vcs": { "enabled": true, "clientKind": "git", "useIgnoreFile": true },
  "files": { "ignore": [".next", "node_modules", "public/search"] },
  "formatter": { "indentStyle": "space", "indentWidth": 2, "lineWidth": 100 },
  "javascript": { "formatter": { "quoteStyle": "double", "semicolons": "always" } },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": { "noNonNullAssertion": "off" },
      "suspicious": { "noExplicitAny": "warn" }
    }
  }
}
```

- [ ] **Step 5: Create tailwind.config.ts + postcss.config.mjs + globals.css**

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)"],
        mono: ["var(--font-geist-mono)"],
      },
      colors: {
        bg: "#0a0a0a",
        fg: "#ededed",
        accent: "#10b981",
        muted: "#525252",
      },
    },
  },
} satisfies Config;
```

`postcss.config.mjs`:
```js
export default { plugins: { "@tailwindcss/postcss": {} } };
```

`app/globals.css`:
```css
@import "tailwindcss";

:root {
  color-scheme: dark;
}

html, body {
  background: #0a0a0a;
  color: #ededed;
  font-family: var(--font-geist-sans), system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Safe-area insets for iOS PWA */
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

- [ ] **Step 6: Create app/layout.tsx**

```tsx
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prompt Hub",
  description: "Personal prompt management for AI workflows",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prompt Hub" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-Hant" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 7: Create app/(app)/page.tsx placeholder**

```tsx
export default function HomePage() {
  return (
    <main className="min-h-dvh flex items-center justify-center">
      <p className="font-mono text-fg/60">Prompt Hub — scaffolding OK</p>
    </main>
  );
}
```

- [ ] **Step 8: Create .env.example**

```
# GitHub (read-only PAT for build-time prompt fetching, optional in dev)
GITHUB_PAT=
GITHUB_REPO=leo-chang/Prefect_Prompt

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth allowlist (comma-separated GitHub logins)
ALLOWED_GITHUB_LOGINS=
```

- [ ] **Step 9: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Create `tests/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 10: Extend .gitignore**

Append:
```
# Next.js
.next/
out/
next-env.d.ts

# Build artifacts
public/search/index.json

# Env
.env
.env.local
.env*.local

# Test
coverage/
playwright-report/
test-results/

# Editor
.vscode/
.idea/
```

- [ ] **Step 11: Install + verify dev server starts**

```bash
pnpm install
pnpm dev
```

Expected: server boots on `http://localhost:3000` showing "Prompt Hub — scaffolding OK". Stop with Ctrl+C.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js 15 + Tailwind 4 + Biome project"
```

---

## Task 2: Placeholder Type System (TDD)

**Files:**
- Create: `lib/placeholders/types.ts`
- Create: `lib/placeholders/registry.ts`
- Create: `lib/placeholders/render.ts`
- Create: `lib/placeholders/validate.ts`
- Create: `tests/unit/placeholders.test.ts`

- [ ] **Step 1: Write failing tests for types + render**

Create `tests/unit/placeholders.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderTemplate } from "@/lib/placeholders/render";
import { validateValues } from "@/lib/placeholders/validate";
import type { PlaceholderSchema } from "@/lib/placeholders/types";

const schema: Record<string, PlaceholderSchema> = {
  PHASE_N: { type: "number", label: "Phase", default: 9 },
  LANE_NAME: { type: "select", label: "Lane", options: ["法人面", "籌碼-分點"] },
  ENABLE: { type: "boolean", label: "Enable", default: false },
  NOTE: { type: "multiline", label: "Note" },
  TITLE: { type: "text", label: "Title" },
};

describe("renderTemplate", () => {
  it("substitutes single placeholder", () => {
    expect(renderTemplate("Phase {PHASE_N} go", { PHASE_N: 9 })).toBe("Phase 9 go");
  });

  it("substitutes multiple placeholders", () => {
    expect(
      renderTemplate("{TITLE}: {LANE_NAME}", { TITLE: "Lane", LANE_NAME: "法人面" }),
    ).toBe("Lane: 法人面");
  });

  it("leaves undefined placeholders untouched", () => {
    expect(renderTemplate("Phase {PHASE_N} {MISSING}", { PHASE_N: 9 })).toBe(
      "Phase 9 {MISSING}",
    );
  });

  it("renders boolean as yes/no", () => {
    expect(renderTemplate("Enable: {ENABLE}", { ENABLE: true })).toBe("Enable: yes");
    expect(renderTemplate("Enable: {ENABLE}", { ENABLE: false })).toBe("Enable: no");
  });

  it("does not substitute inside escaped braces", () => {
    expect(renderTemplate("\\{PHASE_N\\}", { PHASE_N: 9 })).toBe("{PHASE_N}");
  });
});

describe("validateValues", () => {
  it("accepts valid values", () => {
    const result = validateValues(schema, { PHASE_N: 9, LANE_NAME: "法人面" });
    expect(result.ok).toBe(true);
  });

  it("rejects select value not in options", () => {
    const result = validateValues(schema, { LANE_NAME: "INVALID" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.LANE_NAME).toMatch(/options/);
  });

  it("rejects number-typed field with non-number value", () => {
    const result = validateValues(schema, { PHASE_N: "nine" as unknown as number });
    expect(result.ok).toBe(false);
  });

  it("allows missing optional values", () => {
    const result = validateValues(schema, {});
    expect(result.ok).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm test
```

Expected: FAIL with "Cannot find module @/lib/placeholders/render".

- [ ] **Step 3: Implement lib/placeholders/types.ts**

```ts
export type PlaceholderType =
  | "text"
  | "multiline"
  | "number"
  | "select"
  | "boolean"
  | "multiselect"
  | "date"
  | "code"
  | "list"
  | "file-ref";

interface BaseSchema {
  label: string;
  hint?: string;
}

export type PlaceholderSchema =
  | (BaseSchema & { type: "text"; default?: string })
  | (BaseSchema & { type: "multiline"; default?: string })
  | (BaseSchema & { type: "number"; default?: number; suggestions?: number[] })
  | (BaseSchema & { type: "select"; options: (string | number)[]; default?: string | number })
  | (BaseSchema & { type: "boolean"; default?: boolean })
  | (BaseSchema & { type: "multiselect"; options: string[]; default?: string[] })
  | (BaseSchema & { type: "date"; default?: string })
  | (BaseSchema & { type: "code"; language?: string; default?: string })
  | (BaseSchema & { type: "list"; default?: string[] })
  | (BaseSchema & { type: "file-ref"; default?: string });

export type PlaceholderValue =
  | string
  | number
  | boolean
  | string[]
  | undefined;

export type PlaceholderValues = Record<string, PlaceholderValue>;
```

- [ ] **Step 4: Implement lib/placeholders/render.ts**

```ts
import type { PlaceholderValues } from "./types";

const ESCAPED_OPEN = " ESC_OPEN ";
const ESCAPED_CLOSE = " ESC_CLOSE ";

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
```

- [ ] **Step 5: Implement lib/placeholders/validate.ts**

```ts
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
```

- [ ] **Step 6: Implement lib/placeholders/registry.ts (stub for now, MVP types)**

```ts
import type { PlaceholderType } from "./types";

export interface TypeDescriptor {
  /** Human-readable name shown in UI */
  label: string;
  /** Whether this type is implemented in the MVP UI */
  mvp: boolean;
}

export const PLACEHOLDER_TYPES: Record<PlaceholderType, TypeDescriptor> = {
  text: { label: "Text", mvp: true },
  multiline: { label: "Multiline", mvp: true },
  number: { label: "Number", mvp: true },
  select: { label: "Select", mvp: true },
  boolean: { label: "Boolean", mvp: true },
  multiselect: { label: "Multiselect", mvp: false },
  date: { label: "Date", mvp: false },
  code: { label: "Code", mvp: false },
  list: { label: "List", mvp: false },
  "file-ref": { label: "File Reference", mvp: false },
};

export function isMvpType(type: PlaceholderType): boolean {
  return PLACEHOLDER_TYPES[type].mvp;
}
```

- [ ] **Step 7: Run tests to verify pass**

```bash
pnpm test
```

Expected: all 9 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(placeholders): type system + render/validate (MVP 5 types)"
```

---

## Task 3: Prompt Parser + Loader (TDD)

**Files:**
- Create: `lib/prompts/types.ts`
- Create: `lib/prompts/parse.ts`
- Create: `lib/prompts/load.ts`
- Create: `tests/unit/prompts-parse.test.ts`
- Create: `tests/fixtures/prompts/sample.md`

- [ ] **Step 1: Create test fixture**

`tests/fixtures/prompts/sample.md`:
```markdown
---
id: sample
title: Sample Prompt
category: general/test
tags: [test, fixture]
description: A sample for tests
placeholders:
  NAME:
    type: text
    label: Name
    default: world
---

Hello {NAME}!
```

- [ ] **Step 2: Write failing test**

Create `tests/unit/prompts-parse.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePrompt } from "@/lib/prompts/parse";

const fixture = readFileSync(
  path.join(__dirname, "../fixtures/prompts/sample.md"),
  "utf8",
);

describe("parsePrompt", () => {
  it("extracts metadata from frontmatter", () => {
    const doc = parsePrompt(fixture, "factor-research/test/sample.md");
    expect(doc.id).toBe("sample");
    expect(doc.title).toBe("Sample Prompt");
    expect(doc.category).toBe("general/test");
    expect(doc.tags).toEqual(["test", "fixture"]);
  });

  it("extracts placeholder schema", () => {
    const doc = parsePrompt(fixture, "x.md");
    expect(doc.placeholders.NAME.type).toBe("text");
    expect(doc.placeholders.NAME.label).toBe("Name");
  });

  it("returns body without frontmatter", () => {
    const doc = parsePrompt(fixture, "x.md");
    expect(doc.body.trim()).toBe("Hello {NAME}!");
  });

  it("throws on missing required field id", () => {
    const bad = "---\ntitle: x\n---\nbody";
    expect(() => parsePrompt(bad, "x.md")).toThrow(/id/);
  });

  it("throws on missing title", () => {
    const bad = "---\nid: x\n---\nbody";
    expect(() => parsePrompt(bad, "x.md")).toThrow(/title/);
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
pnpm test prompts-parse
```

Expected: FAIL "Cannot find module @/lib/prompts/parse".

- [ ] **Step 4: Implement lib/prompts/types.ts**

```ts
import type { PlaceholderSchema } from "@/lib/placeholders/types";

export interface PromptDoc {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description?: string;
  estimated_time?: string;
  agent_count?: string;
  placeholders: Record<string, PlaceholderSchema>;
  body: string;
  filePath: string;
}

export interface PromptIndexEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  description?: string;
  slug: string;
}
```

- [ ] **Step 5: Implement lib/prompts/parse.ts**

```ts
import matter from "gray-matter";
import { z } from "zod";
import type { PromptDoc } from "./types";
import type { PlaceholderSchema } from "@/lib/placeholders/types";

const placeholderSchemaZ: z.ZodType<PlaceholderSchema> = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), label: z.string(), hint: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal("multiline"), label: z.string(), hint: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal("number"), label: z.string(), hint: z.string().optional(), default: z.number().optional(), suggestions: z.array(z.number()).optional() }),
  z.object({ type: z.literal("select"), label: z.string(), hint: z.string().optional(), options: z.array(z.union([z.string(), z.number()])), default: z.union([z.string(), z.number()]).optional() }),
  z.object({ type: z.literal("boolean"), label: z.string(), hint: z.string().optional(), default: z.boolean().optional() }),
  z.object({ type: z.literal("multiselect"), label: z.string(), hint: z.string().optional(), options: z.array(z.string()), default: z.array(z.string()).optional() }),
  z.object({ type: z.literal("date"), label: z.string(), hint: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal("code"), label: z.string(), hint: z.string().optional(), language: z.string().optional(), default: z.string().optional() }),
  z.object({ type: z.literal("list"), label: z.string(), hint: z.string().optional(), default: z.array(z.string()).optional() }),
  z.object({ type: z.literal("file-ref"), label: z.string(), hint: z.string().optional(), default: z.string().optional() }),
]);

const frontmatterZ = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/, "id must be kebab-case"),
  title: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()).default([]),
  description: z.string().optional(),
  estimated_time: z.string().optional(),
  agent_count: z.string().optional(),
  placeholders: z.record(placeholderSchemaZ).default({}),
});

export function parsePrompt(rawMarkdown: string, filePath: string): PromptDoc {
  const { data, content } = matter(rawMarkdown);
  const parsed = frontmatterZ.safeParse(data);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid frontmatter in ${filePath}: ${issues}`);
  }
  return { ...parsed.data, body: content, filePath };
}
```

- [ ] **Step 6: Implement lib/prompts/load.ts**

```ts
import { readdirSync, readFileSync, statSync } from "node:fs";
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
```

- [ ] **Step 7: Run tests to verify pass**

```bash
pnpm test prompts-parse
```

Expected: all 5 tests PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(prompts): frontmatter parser + filesystem loader with zod validation"
```

---

## Task 4: Build-Time Prompt Validator

**Files:**
- Create: `scripts/validate-prompts.ts`
- Create: `tests/unit/validate-prompts.test.ts` (optional integration check)

- [ ] **Step 1: Write the validator script**

`scripts/validate-prompts.ts`:

```ts
import { loadAllPrompts } from "@/lib/prompts/load";
import { extractPlaceholderKeys } from "@/lib/placeholders/render";

function fail(msg: string): never {
  console.error(`\n❌ Prompt validation failed:\n   ${msg}\n`);
  process.exit(1);
}

function main() {
  const prompts = loadAllPrompts();
  console.log(`Validating ${prompts.length} prompts...`);

  // 1. Unique ids
  const seen = new Map<string, string>();
  for (const p of prompts) {
    if (seen.has(p.id)) {
      fail(`Duplicate id "${p.id}" in ${p.filePath} (also in ${seen.get(p.id)})`);
    }
    seen.set(p.id, p.filePath);
  }

  // 2. category matches actual folder path
  for (const p of prompts) {
    const expectedCategoryPath = `prompts/${p.category}/`;
    if (!p.filePath.startsWith(expectedCategoryPath)) {
      fail(
        `Category mismatch in ${p.filePath}: frontmatter says "${p.category}" but file is not under ${expectedCategoryPath}`,
      );
    }
  }

  // 3. body placeholders all defined in frontmatter (warn, not fail)
  for (const p of prompts) {
    const used = extractPlaceholderKeys(p.body);
    const defined = new Set(Object.keys(p.placeholders));
    const undef = used.filter((k) => !defined.has(k));
    if (undef.length > 0) {
      console.warn(
        `⚠️  ${p.filePath}: body uses undefined placeholders: ${undef.join(", ")} (will render as raw text)`,
      );
    }
    const unused = Array.from(defined).filter((k) => !used.includes(k));
    if (unused.length > 0) {
      console.warn(
        `⚠️  ${p.filePath}: frontmatter defines unused placeholders: ${unused.join(", ")}`,
      );
    }
  }

  console.log(`✓ ${prompts.length} prompts valid`);
}

main();
```

- [ ] **Step 2: Run validator on existing 3 prompts**

```bash
pnpm validate:prompts
```

Expected: `✓ 3 prompts valid` (warnings about unused/undefined placeholders are OK).

- [ ] **Step 3: Test failure path: create a duplicate-id fixture and verify exit 1**

```bash
# Create a temp dup file
cp prompts/factor-research/brainstorm/factor-brainstorm-parallel.md /tmp/dup.md
cp /tmp/dup.md prompts/factor-research/brainstorm/dup.md
pnpm validate:prompts; echo "exit=$?"
```

Expected: `exit=1` with "Duplicate id" message.

Clean up:
```bash
rm prompts/factor-research/brainstorm/dup.md
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(build): add validate-prompts script (uniqueness + category + placeholder consistency)"
```

---

## Task 5: Build-Time Search Index Generator

**Files:**
- Create: `lib/search/build.ts`
- Create: `scripts/build-search-index.ts`
- Create: `lib/search/types.ts`

- [ ] **Step 1: Define index entry type**

`lib/search/types.ts`:

```ts
export interface SearchDoc {
  id: string;
  slug: string;
  title: string;
  category: string;
  tags: string[];
  description: string;
}
```

- [ ] **Step 2: Implement lib/search/build.ts**

```ts
import MiniSearch from "minisearch";
import type { PromptDoc } from "@/lib/prompts/types";
import type { SearchDoc } from "./types";

export function promptToSlug(p: PromptDoc): string {
  return p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "");
}

export function buildSearchIndex(prompts: PromptDoc[]): {
  docs: SearchDoc[];
  indexJson: string;
} {
  const docs: SearchDoc[] = prompts.map((p) => ({
    id: p.id,
    slug: promptToSlug(p),
    title: p.title,
    category: p.category,
    tags: p.tags,
    description: p.description ?? "",
  }));

  const mini = new MiniSearch<SearchDoc>({
    fields: ["title", "category", "tags", "description"],
    storeFields: ["id", "slug", "title", "category", "tags", "description"],
    searchOptions: { boost: { title: 3, tags: 2 }, fuzzy: 0.2, prefix: true },
  });
  mini.addAll(docs);

  return { docs, indexJson: JSON.stringify(mini.toJSON()) };
}
```

- [ ] **Step 3: Implement scripts/build-search-index.ts**

```ts
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadAllPrompts } from "@/lib/prompts/load";
import { buildSearchIndex } from "@/lib/search/build";

const OUT_DIR = path.join(process.cwd(), "public", "search");

function main() {
  const prompts = loadAllPrompts();
  const { docs, indexJson } = buildSearchIndex(prompts);

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(path.join(OUT_DIR, "index.json"), indexJson, "utf8");
  writeFileSync(path.join(OUT_DIR, "docs.json"), JSON.stringify(docs, null, 0), "utf8");

  console.log(`✓ Built search index: ${prompts.length} prompts → public/search/`);
}

main();
```

- [ ] **Step 4: Run + verify output**

```bash
pnpm build:search
ls public/search/
```

Expected: `index.json` and `docs.json` exist; `cat public/search/docs.json | head -1` shows JSON array.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(search): build-time MiniSearch index generator"
```

---

## Task 6: Supabase Schema + Migration

**Files:**
- Create: `supabase/migrations/0001_init.sql`

- [ ] **Step 1: Write migration**

`supabase/migrations/0001_init.sql`:

```sql
-- Prompt Hub initial schema
-- Run via: supabase db push  (or paste in Supabase SQL editor)

create table if not exists public.presets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  prompt_id    text not null,
  name         text not null,
  values       jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists presets_user_prompt_idx
  on public.presets(user_id, prompt_id);

create table if not exists public.recent_uses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  preset_id    uuid references public.presets(id) on delete cascade,
  prompt_id    text not null,
  used_at      timestamptz default now(),
  primary key (user_id, prompt_id, preset_id)
);

create index if not exists recent_uses_user_used_idx
  on public.recent_uses(user_id, used_at desc);

-- RLS
alter table public.presets enable row level security;
alter table public.recent_uses enable row level security;

drop policy if exists "own presets" on public.presets;
create policy "own presets" on public.presets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own recent" on public.recent_uses;
create policy "own recent" on public.recent_uses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists presets_updated_at on public.presets;
create trigger presets_updated_at
  before update on public.presets
  for each row execute function public.set_updated_at();
```

- [ ] **Step 2: Apply via Supabase Dashboard**

User runs manually (this step is documentation, not code):
1. Open Supabase project → SQL Editor
2. Paste contents of `supabase/migrations/0001_init.sql`
3. Run
4. Verify `presets` and `recent_uses` tables exist in Table Editor

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat(db): initial Supabase schema (presets, recent_uses, RLS)"
```

---

## Task 7: Supabase Client Helpers + Auth Middleware

**Files:**
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/middleware.ts`
- Create: `lib/auth/allowlist.ts`
- Create: `middleware.ts` (Next.js root middleware)
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/auth/callback/route.ts`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create lib/supabase/server.ts**

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options as CookieOptions);
          }
        },
      },
    },
  );
}
```

- [ ] **Step 2: Create lib/supabase/client.ts**

```ts
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Create lib/supabase/middleware.ts**

```ts
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  return { response, user, supabase };
}
```

- [ ] **Step 4: Create lib/auth/allowlist.ts**

```ts
export function isAllowed(githubLogin: string | undefined): boolean {
  if (!githubLogin) return false;
  const raw = process.env.ALLOWED_GITHUB_LOGINS ?? "";
  if (raw.trim() === "") return false; // explicit empty = nobody
  const list = raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return list.includes(githubLogin.toLowerCase());
}
```

- [ ] **Step 5: Create middleware.ts at repo root**

```ts
import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { isAllowed } from "@/lib/auth/allowlist";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return response;

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  const githubLogin = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(githubLogin)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "not_allowed");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|search).*)"],
};
```

- [ ] **Step 6: Create app/(auth)/login/page.tsx**

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

function LoginInner() {
  const params = useSearchParams();
  const error = params.get("error");

  async function signIn() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "read:user",
      },
    });
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 px-6">
      <h1 className="font-mono text-2xl">Prompt Hub</h1>
      {error === "not_allowed" && (
        <p className="text-red-400 text-sm font-mono">未授權的 GitHub 帳號</p>
      )}
      {error === "oauth" && (
        <p className="text-red-400 text-sm font-mono">登入失敗，請重試</p>
      )}
      <button
        type="button"
        onClick={signIn}
        className="bg-fg text-bg px-6 py-3 rounded-md font-medium hover:bg-fg/90"
      >
        Continue with GitHub
      </button>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
```

- [ ] **Step 7: Create app/(auth)/auth/callback/route.ts**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login?error=oauth", request.url));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=oauth", request.url));

  return NextResponse.redirect(new URL("/", request.url));
}
```

- [ ] **Step 8: Create app/(app)/layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowlist";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const login = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(login)) redirect("/login?error=not_allowed");
  return <>{children}</>;
}
```

- [ ] **Step 9: Verify dev server with .env.local set**

User creates `.env.local` from `.env.example` with real Supabase values + their GitHub login in `ALLOWED_GITHUB_LOGINS`. Then:

```bash
pnpm dev
```

Visit `http://localhost:3000` → expect redirect to `/login`. Sign in with GitHub → redirect back to `/`. Showing scaffolding text means auth path works.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(auth): Supabase + GitHub OAuth + allowlist middleware"
```

---

## Task 8: Preset CRUD API

**Files:**
- Create: `app/api/presets/route.ts`
- Create: `app/api/presets/[id]/route.ts`
- Create: `app/api/recent-uses/route.ts`
- Create: `lib/api/responses.ts`

- [ ] **Step 1: Create lib/api/responses.ts**

```ts
import { NextResponse } from "next/server";

export const json = NextResponse.json;
export const unauthorized = () => NextResponse.json({ error: "unauthorized" }, { status: 401 });
export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });
export const notFound = () => NextResponse.json({ error: "not_found" }, { status: 404 });
export const serverError = (msg: string) =>
  NextResponse.json({ error: msg }, { status: 500 });
```

- [ ] **Step 2: Create app/api/presets/route.ts**

```ts
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { badRequest, json, unauthorized } from "@/lib/api/responses";

const createBodyZ = z.object({
  prompt_id: z.string().min(1),
  name: z.string().min(1).max(120),
  values: z.record(z.unknown()),
});

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const { data, error } = await supabase
    .from("presets")
    .select("id, prompt_id, name, values, created_at, updated_at")
    .order("updated_at", { ascending: false });
  if (error) return badRequest(error.message);
  return json({ presets: data });
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = createBodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { data, error } = await supabase
    .from("presets")
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();
  if (error) return badRequest(error.message);
  return json({ preset: data }, { status: 201 });
}
```

- [ ] **Step 3: Create app/api/presets/[id]/route.ts**

```ts
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { badRequest, json, notFound, unauthorized } from "@/lib/api/responses";

const patchBodyZ = z.object({
  name: z.string().min(1).max(120).optional(),
  values: z.record(z.unknown()).optional(),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = patchBodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { data, error } = await supabase
    .from("presets")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();
  if (error) return badRequest(error.message);
  if (!data) return notFound();
  return json({ preset: data });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  const { error } = await supabase.from("presets").delete().eq("id", id);
  if (error) return badRequest(error.message);
  return json({ ok: true });
}
```

- [ ] **Step 4: Create app/api/recent-uses/route.ts**

```ts
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { badRequest, json, unauthorized } from "@/lib/api/responses";

const bodyZ = z.object({
  prompt_id: z.string().min(1),
  preset_id: z.string().uuid().nullable(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();

  const body = await req.json().catch(() => null);
  const parsed = bodyZ.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.message);

  const { error } = await supabase.from("recent_uses").upsert(
    {
      user_id: user.id,
      prompt_id: parsed.data.prompt_id,
      preset_id: parsed.data.preset_id,
      used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,prompt_id,preset_id" },
  );
  if (error) return badRequest(error.message);
  return json({ ok: true });
}

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return unauthorized();
  const { data, error } = await supabase
    .from("recent_uses")
    .select("preset_id, prompt_id, used_at")
    .order("used_at", { ascending: false })
    .limit(10);
  if (error) return badRequest(error.message);
  return json({ recent: data });
}
```

- [ ] **Step 5: Smoke test via curl (after `pnpm dev` + browser-logged-in cookie copy)**

```bash
# Use browser dev tools to copy session cookie, then:
curl -H "Cookie: <your-supabase-cookies>" http://localhost:3000/api/presets
```

Expected: `{"presets": []}` first run.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(api): preset CRUD + recent_uses endpoints with zod validation"
```

---

## Task 9: Placeholder Form Component (TDD)

**Files:**
- Create: `components/prompt/PlaceholderForm.tsx`
- Create: `components/ui/Field.tsx`
- Create: `tests/unit/PlaceholderForm.test.tsx`
- Create: `lib/utils/cn.ts`

- [ ] **Step 1: Create lib/utils/cn.ts**

```ts
import clsx, { type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 2: Create components/ui/Field.tsx**

```tsx
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export function Field({
  label, hint, children, className,
}: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("flex flex-col gap-1", className)}>
      <span className="text-xs font-mono text-fg/70">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  );
}
```

- [ ] **Step 3: Write failing test**

`tests/unit/PlaceholderForm.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlaceholderForm } from "@/components/prompt/PlaceholderForm";
import type { PlaceholderSchema } from "@/lib/placeholders/types";

const schema: Record<string, PlaceholderSchema> = {
  PHASE_N: { type: "number", label: "Phase", default: 9 },
  LANE_NAME: { type: "select", label: "Lane", options: ["A", "B"], default: "A" },
  ENABLE: { type: "boolean", label: "Enable", default: false },
};

describe("PlaceholderForm", () => {
  it("renders all defined placeholder fields", () => {
    render(<PlaceholderForm schema={schema} values={{}} onChange={() => {}} />);
    expect(screen.getByText("Phase")).toBeInTheDocument();
    expect(screen.getByText("Lane")).toBeInTheDocument();
    expect(screen.getByText("Enable")).toBeInTheDocument();
  });

  it("calls onChange when number input changes", () => {
    let captured: Record<string, unknown> = {};
    render(
      <PlaceholderForm
        schema={schema}
        values={{ PHASE_N: 9 }}
        onChange={(v) => { captured = v; }}
      />,
    );
    const input = screen.getByLabelText(/Phase/) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "10" } });
    expect(captured.PHASE_N).toBe(10);
  });

  it("calls onChange when select changes", () => {
    let captured: Record<string, unknown> = {};
    render(
      <PlaceholderForm
        schema={schema}
        values={{ LANE_NAME: "A" }}
        onChange={(v) => { captured = v; }}
      />,
    );
    const select = screen.getByLabelText(/Lane/) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "B" } });
    expect(captured.LANE_NAME).toBe("B");
  });
});
```

- [ ] **Step 4: Run test, verify fail**

```bash
pnpm test PlaceholderForm
```

Expected: FAIL.

- [ ] **Step 5: Implement components/prompt/PlaceholderForm.tsx**

```tsx
"use client";

import type { PlaceholderSchema, PlaceholderValues } from "@/lib/placeholders/types";
import { Field } from "@/components/ui/Field";

interface Props {
  schema: Record<string, PlaceholderSchema>;
  values: PlaceholderValues;
  onChange: (next: PlaceholderValues) => void;
}

export function PlaceholderForm({ schema, values, onChange }: Props) {
  const set = (key: string, value: unknown) => onChange({ ...values, [key]: value });

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
  const baseClass = "bg-bg border border-fg/20 rounded px-3 py-2 font-mono text-sm focus:border-accent focus:outline-none";

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
            <option key={String(o)} value={String(o)}>{String(o)}</option>
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
      return (
        <span className="text-xs text-muted">
          (type "{spec.type}" not yet implemented)
        </span>
      );
  }
}
```

- [ ] **Step 6: Run test to verify pass**

```bash
pnpm test PlaceholderForm
```

Expected: 3 tests PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(prompt): PlaceholderForm component (text/multiline/number/select/boolean)"
```

---

## Task 10: CopyButton with Haptic + Toast

**Files:**
- Create: `components/prompt/CopyButton.tsx`
- Create: `components/ui/Toast.tsx`
- Create: `tests/unit/CopyButton.test.tsx`

- [ ] **Step 1: Create components/ui/Toast.tsx**

```tsx
"use client";

import * as RT from "@radix-ui/react-toast";
import { createContext, useContext, useState, type ReactNode } from "react";

interface ToastItem { id: number; message: string }
interface Ctx { show: (msg: string) => void }
const ToastContext = createContext<Ctx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = (message: string) => {
    const id = Date.now();
    setItems((prev) => [...prev, { id, message }]);
    setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 1500);
  };
  return (
    <ToastContext.Provider value={{ show }}>
      <RT.Provider swipeDirection="down">
        {children}
        {items.map((i) => (
          <RT.Root key={i.id} open className="bg-accent text-bg font-mono text-sm px-4 py-2 rounded-md">
            <RT.Description>{i.message}</RT.Description>
          </RT.Root>
        ))}
        <RT.Viewport className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 outline-none" />
      </RT.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
```

- [ ] **Step 2: Write failing test**

`tests/unit/CopyButton.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CopyButton } from "@/components/prompt/CopyButton";
import { ToastProvider } from "@/components/ui/Toast";

describe("CopyButton", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      vibrate: vi.fn(),
    });
  });

  it("copies the text on click and shows toast", async () => {
    render(
      <ToastProvider>
        <CopyButton text="hello world" />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: /copy/i }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world"));
    expect(navigator.vibrate).toHaveBeenCalledWith(10);
  });

  it("shows char count in label", () => {
    render(
      <ToastProvider>
        <CopyButton text="abcde" />
      </ToastProvider>,
    );
    expect(screen.getByRole("button", { name: /5\s*字/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test, verify fail**

```bash
pnpm test CopyButton
```

- [ ] **Step 4: Implement components/prompt/CopyButton.tsx**

```tsx
"use client";

import { useState } from "react";
import { Clipboard } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface Props {
  text: string;
  onCopied?: () => void;
  variant?: "primary" | "secondary";
}

export function CopyButton({ text, onCopied, variant = "primary" }: Props) {
  const [flashing, setFlashing] = useState(false);
  const { show } = useToast();

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        // fallback for non-secure contexts
        const ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove();
      }
      navigator.vibrate?.(10);
      setFlashing(true);
      setTimeout(() => setFlashing(false), 220);
      show(`✓ 已複製 ${text.length.toLocaleString()} 字`);
      onCopied?.();
    } catch {
      show("⚠ 複製失敗，請手動長按");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "flex items-center justify-center gap-3 w-full rounded-xl font-mono font-medium transition-transform active:scale-95",
          variant === "primary"
            ? "bg-accent text-bg py-5 text-lg min-h-[64px]"
            : "bg-fg/10 text-fg py-3 text-sm",
        )}
        aria-label={`Copy (${text.length} 字)`}
      >
        <Clipboard className="size-5" />
        <span>📋 COPY ({text.length.toLocaleString()} 字)</span>
      </button>
      {flashing && (
        <div
          aria-hidden
          className="fixed inset-0 bg-accent/30 z-40 pointer-events-none"
        />
      )}
    </>
  );
}
```

- [ ] **Step 5: Run test to verify pass**

```bash
pnpm test CopyButton
```

Expected: 2 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(prompt): CopyButton with clipboard + vibrate + flash + toast"
```

---

## Task 11: Prompt Detail Page

**Files:**
- Create: `app/(app)/prompts/[...slug]/page.tsx`
- Create: `components/prompt/PreviewPane.tsx`
- Create: `components/prompt/PresetSelector.tsx`
- Create: `components/prompt/PromptDetailClient.tsx`
- Modify: `app/(app)/layout.tsx` (wrap children in ToastProvider)

- [ ] **Step 1: Wrap (app)/layout.tsx with ToastProvider**

Modify `app/(app)/layout.tsx`:

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowlist";
import { ToastProvider } from "@/components/ui/Toast";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const login = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(login)) redirect("/login?error=not_allowed");
  return <ToastProvider>{children}</ToastProvider>;
}
```

- [ ] **Step 2: Create components/prompt/PreviewPane.tsx**

```tsx
"use client";

import { useMemo } from "react";
import { renderTemplate, extractPlaceholderKeys } from "@/lib/placeholders/render";
import type { PlaceholderValues } from "@/lib/placeholders/types";

export function PreviewPane({
  template, values,
}: { template: string; values: PlaceholderValues }) {
  const rendered = useMemo(() => renderTemplate(template, values), [template, values]);
  const usedKeys = useMemo(() => extractPlaceholderKeys(template), [template]);
  const missing = usedKeys.filter((k) => values[k] === undefined || values[k] === "");

  return (
    <div className="flex flex-col gap-2">
      {missing.length > 0 && (
        <p className="text-xs font-mono text-yellow-400">
          未填: {missing.join(", ")}（會以 {`{`}原樣{`}`} 輸出）
        </p>
      )}
      <pre className="bg-fg/5 rounded p-4 font-mono text-xs whitespace-pre-wrap overflow-x-auto max-h-[60vh] overflow-y-auto">
        {rendered}
      </pre>
    </div>
  );
}
```

- [ ] **Step 3: Create components/prompt/PresetSelector.tsx**

```tsx
"use client";

import type { PlaceholderValues } from "@/lib/placeholders/types";

export interface PresetSummary {
  id: string;
  name: string;
  values: PlaceholderValues;
}

export function PresetSelector({
  presets, currentId, onSelect, onNew,
}: {
  presets: PresetSummary[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
}) {
  if (presets.length === 0) {
    return (
      <button type="button" onClick={onNew} className="text-sm font-mono text-accent">
        + 建立第一個 Preset
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono text-fg/70 uppercase">Preset ({presets.length})</h3>
        <button type="button" onClick={onNew} className="text-xs font-mono text-accent">+ New</button>
      </div>
      <div className="flex flex-col gap-1">
        {presets.map((p) => (
          <button
            type="button"
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`text-left px-3 py-2 rounded font-mono text-sm border ${
              p.id === currentId ? "border-accent bg-accent/10" : "border-fg/10 hover:border-fg/30"
            }`}
          >
            {p.id === currentId ? "◉ " : "○ "}{p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create components/prompt/PromptDetailClient.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import { PlaceholderForm } from "./PlaceholderForm";
import { PreviewPane } from "./PreviewPane";
import { CopyButton } from "./CopyButton";
import { PresetSelector, type PresetSummary } from "./PresetSelector";
import type { PlaceholderSchema, PlaceholderValues } from "@/lib/placeholders/types";
import { renderTemplate } from "@/lib/placeholders/render";
import { useToast } from "@/components/ui/Toast";

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
      .then((d) => setPresets((d.presets ?? []).filter((p: PresetSummary & { prompt_id: string }) => p.prompt_id === promptId)))
      .catch(() => {});
  }, [promptId]);

  function selectPreset(id: string) {
    const p = presets.find((x) => x.id === id);
    if (!p) return;
    setCurrentPresetId(id);
    setValues({ ...defaultValues(schema), ...p.values });
  }

  async function savePreset() {
    const name = prompt("Preset 名稱?");
    if (!name) return;
    const res = await fetch("/api/presets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId, name, values }),
    });
    if (!res.ok) { show("⚠ 儲存失敗"); return; }
    const { preset } = await res.json();
    setPresets((p) => [{ id: preset.id, name: preset.name, values: preset.values }, ...p]);
    setCurrentPresetId(preset.id);
    show(`✓ 已存 preset「${name}」`);
  }

  function logRecentUse() {
    fetch("/api/recent-uses", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt_id: promptId, preset_id: currentPresetId }),
    }).catch(() => {});
    if (typeof window !== "undefined") {
      localStorage.setItem("lastAction", JSON.stringify({
        promptId, presetId: currentPresetId, values, title, ts: Date.now(),
      }));
    }
  }

  const rendered = renderTemplate(body, values);

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
      <div className="fixed bottom-0 inset-x-0 bg-bg/95 backdrop-blur border-t border-fg/10 p-4 flex gap-2 max-w-5xl mx-auto" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
        <button
          type="button"
          onClick={savePreset}
          className="bg-fg/10 text-fg px-4 py-3 rounded-md font-mono text-sm"
        >
          💾 Save
        </button>
        <div className="flex-1" onClick={logRecentUse}>
          <CopyButton text={rendered} />
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 5: Create app/(app)/prompts/[...slug]/page.tsx**

```tsx
import { notFound } from "next/navigation";
import { loadAllPrompts } from "@/lib/prompts/load";
import { PromptDetailClient } from "@/components/prompt/PromptDetailClient";

export const dynamic = "force-static";
export const revalidate = 60;

export async function generateStaticParams() {
  const prompts = loadAllPrompts();
  return prompts.map((p) => ({
    slug: p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "").split("/"),
  }));
}

export default async function PromptPage({
  params,
}: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const slugPath = slug.join("/");
  const prompts = loadAllPrompts();
  const prompt = prompts.find(
    (p) => p.filePath.replace(/^prompts\//, "").replace(/\.md$/, "") === slugPath,
  );
  if (!prompt) notFound();

  return (
    <PromptDetailClient
      promptId={prompt.id}
      title={prompt.title}
      body={prompt.body}
      schema={prompt.placeholders}
    />
  );
}
```

- [ ] **Step 6: Verify in browser**

```bash
pnpm dev
```

Visit `/prompts/factor-research/brainstorm/factor-brainstorm-parallel`. Expected: title, form fields appear, preview replaces placeholders, copy button works.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(prompt): detail page with form + preview + preset selector + sticky copy bar"
```

---

## Task 12: Home Page (Last Action Hero + Recent List)

**Files:**
- Create: `components/home/LastActionHero.tsx`
- Create: `components/home/RecentList.tsx`
- Modify: `app/(app)/page.tsx`

- [ ] **Step 1: Create components/home/LastActionHero.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/prompt/CopyButton";

interface LastAction {
  promptId: string;
  presetId: string | null;
  values: Record<string, unknown>;
  title: string;
  ts: number;
  rendered?: string;
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "剛剛";
  if (mins < 60) return `${mins} 分鐘前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} 小時前`;
  return `${Math.floor(hrs / 24)} 天前`;
}

export function LastActionHero() {
  const [last, setLast] = useState<LastAction | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("lastAction");
    if (!raw) return;
    try { setLast(JSON.parse(raw)); } catch { /* ignore */ }
  }, []);

  if (!last) {
    return (
      <section className="text-center py-12">
        <p className="font-mono text-fg/60">尚未使用任何 Prompt</p>
        <Link href="/prompts" className="font-mono text-accent text-sm mt-2 inline-block">
          瀏覽 Prompt →
        </Link>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-4 py-8">
      <Link href={`/prompts/${last.promptId}`} className="block">
        <p className="font-mono text-2xl">{last.title}</p>
        <p className="font-mono text-xs text-fg/60 mt-1">
          {last.promptId} · {formatAgo(last.ts)}
        </p>
      </Link>
      {last.rendered && <CopyButton text={last.rendered} />}
    </section>
  );
}
```

Note: `rendered` is stored alongside in step 2 below.

- [ ] **Step 2: Update PromptDetailClient.logRecentUse to also store rendered output**

Modify `components/prompt/PromptDetailClient.tsx` `logRecentUse`:

```tsx
function logRecentUse() {
  fetch("/api/recent-uses", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt_id: promptId, preset_id: currentPresetId }),
  }).catch(() => {});
  if (typeof window !== "undefined") {
    localStorage.setItem("lastAction", JSON.stringify({
      promptId, presetId: currentPresetId, values, title, rendered, ts: Date.now(),
    }));
  }
}
```

- [ ] **Step 3: Create components/home/RecentList.tsx**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Recent { preset_id: string | null; prompt_id: string; used_at: string }
interface Preset { id: string; name: string; prompt_id: string }

export function RecentList() {
  const [recent, setRecent] = useState<Recent[]>([]);
  const [presets, setPresets] = useState<Record<string, Preset>>({});

  useEffect(() => {
    Promise.all([
      fetch("/api/recent-uses").then((r) => r.json()),
      fetch("/api/presets").then((r) => r.json()),
    ]).then(([rec, pre]) => {
      setRecent(rec.recent ?? []);
      const map: Record<string, Preset> = {};
      for (const p of pre.presets ?? []) map[p.id] = p;
      setPresets(map);
    }).catch(() => {});
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-mono text-fg/70 uppercase">Recent</h3>
      <ul className="flex flex-col gap-1">
        {recent.slice(0, 5).map((r, i) => {
          const p = r.preset_id ? presets[r.preset_id] : null;
          const label = p ? p.name : r.prompt_id;
          return (
            <li key={`${r.prompt_id}-${r.preset_id}-${i}`}>
              <Link
                href={`/prompts/${r.prompt_id}`}
                className="flex justify-between items-center px-3 py-2 rounded hover:bg-fg/5 font-mono text-sm"
              >
                <span>{label}</span>
                <span className="text-xs text-muted">↗</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: Replace app/(app)/page.tsx**

```tsx
import { LastActionHero } from "@/components/home/LastActionHero";
import { RecentList } from "@/components/home/RecentList";

export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8 min-h-dvh">
      <LastActionHero />
      <RecentList />
      <p className="text-xs text-muted text-center mt-auto">
        ╲╱  下拉搜尋全部  ╲╱
      </p>
    </main>
  );
}
```

- [ ] **Step 5: Verify in browser**

```bash
pnpm dev
```

Visit `/`. Expected: empty state first time. Visit `/prompts/...`, copy something, return to `/`. Hero shows last action with copy button hot.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(home): Last Action hero + Recent list (resumption-first IA)"
```

---

## Task 13: Command Palette (Pull-to-Search + Cmd+K)

**Files:**
- Create: `components/command-palette/CommandPalette.tsx`
- Create: `components/command-palette/usePullToOpen.ts`
- Create: `lib/search/client.ts`
- Modify: `app/(app)/layout.tsx`

- [ ] **Step 1: Create lib/search/client.ts**

```ts
import MiniSearch from "minisearch";
import type { SearchDoc } from "./types";

let cached: { mini: MiniSearch<SearchDoc>; docs: SearchDoc[] } | null = null;

export async function loadSearchIndex() {
  if (cached) return cached;
  const [indexJson, docsJson] = await Promise.all([
    fetch("/search/index.json").then((r) => r.text()),
    fetch("/search/docs.json").then((r) => r.json() as Promise<SearchDoc[]>),
  ]);
  const mini = MiniSearch.loadJSON<SearchDoc>(indexJson, {
    fields: ["title", "category", "tags", "description"],
    storeFields: ["id", "slug", "title", "category", "tags", "description"],
  });
  cached = { mini, docs: docsJson };
  return cached;
}

export async function search(query: string): Promise<SearchDoc[]> {
  if (!query.trim()) {
    const { docs } = await loadSearchIndex();
    return docs;
  }
  const { mini } = await loadSearchIndex();
  const results = mini.search(query, { boost: { title: 3, tags: 2 }, fuzzy: 0.2, prefix: true });
  return results as unknown as SearchDoc[];
}
```

- [ ] **Step 2: Create components/command-palette/usePullToOpen.ts**

```ts
"use client";

import { useEffect } from "react";

export function usePullToOpen(onOpen: () => void) {
  useEffect(() => {
    let startY: number | null = null;
    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 0) return;
      startY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 80) { onOpen(); startY = null; }
    }
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); onOpen();
      }
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [onOpen]);
}
```

- [ ] **Step 3: Create components/command-palette/CommandPalette.tsx**

```tsx
"use client";

import * as Dialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { search } from "@/lib/search/client";
import type { SearchDoc } from "@/lib/search/types";
import { usePullToOpen } from "./usePullToOpen";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchDoc[]>([]);

  usePullToOpen(() => setOpen(true));

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    search(q).then((r) => { if (!cancelled) setResults(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [q, open]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          aria-label="Open search"
          className="fixed top-3 right-3 z-30 size-10 rounded-full bg-fg/10 flex items-center justify-center"
        >
          <Search className="size-5" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/70 z-40 data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content
          className="fixed inset-x-0 top-0 z-50 bg-bg border-b border-fg/10 max-h-[80vh] flex flex-col"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <Dialog.Title className="sr-only">Search prompts</Dialog.Title>
          <div className="flex items-center gap-2 p-3 border-b border-fg/10">
            <Search className="size-4 text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜尋 prompt / preset..."
              className="flex-1 bg-transparent font-mono text-sm focus:outline-none"
            />
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className="text-muted">
                <X className="size-4" />
              </button>
            </Dialog.Close>
          </div>
          <ul className="overflow-y-auto">
            {results.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/prompts/${r.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex flex-col px-4 py-3 hover:bg-fg/5 font-mono text-sm"
                >
                  <span>{r.title}</span>
                  <span className="text-xs text-muted">{r.category}</span>
                </Link>
              </li>
            ))}
            {results.length === 0 && (
              <li className="px-4 py-6 text-center text-muted text-sm font-mono">無結果</li>
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 4: Mount CommandPalette in app/(app)/layout.tsx**

```tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth/allowlist";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/command-palette/CommandPalette";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const login = user.user_metadata?.user_name as string | undefined;
  if (!isAllowed(login)) redirect("/login?error=not_allowed");
  return (
    <ToastProvider>
      <CommandPalette />
      {children}
    </ToastProvider>
  );
}
```

- [ ] **Step 5: Verify**

```bash
pnpm build:search   # generate index
pnpm dev
```

In browser, press Cmd+K → palette opens; type partial title → results show; click → navigate. Mobile (DevTools device toolbar): pull down at top → palette opens.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(search): command palette with pull-to-search + Cmd+K + lazy index"
```

---

## Task 14: Presets Management Page

**Files:**
- Create: `app/(app)/presets/page.tsx`

- [ ] **Step 1: Implement page**

`app/(app)/presets/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trash2, Pencil } from "lucide-react";

interface Preset {
  id: string; prompt_id: string; name: string;
  values: Record<string, unknown>; updated_at: string;
}

export default function PresetsPage() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/presets").then((r) => r.json()).then((d) => {
      setPresets(d.presets ?? []); setLoading(false);
    });
  }, []);

  async function rename(p: Preset) {
    const name = prompt("新名稱", p.name);
    if (!name || name === p.name) return;
    const res = await fetch(`/api/presets/${p.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (res.ok) setPresets((arr) => arr.map((x) => x.id === p.id ? { ...x, name } : x));
  }

  async function remove(p: Preset) {
    if (!confirm(`刪除 preset「${p.name}」?`)) return;
    const res = await fetch(`/api/presets/${p.id}`, { method: "DELETE" });
    if (res.ok) setPresets((arr) => arr.filter((x) => x.id !== p.id));
  }

  if (loading) return <main className="p-6 font-mono text-muted">Loading...</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
      <h1 className="font-mono text-xl">My Presets</h1>
      {presets.length === 0 && (
        <p className="text-muted font-mono text-sm">尚未建立任何 preset</p>
      )}
      <ul className="flex flex-col gap-2">
        {presets.map((p) => (
          <li key={p.id} className="flex items-center justify-between border border-fg/10 rounded p-3">
            <div className="flex flex-col">
              <Link href={`/prompts/${p.prompt_id}`} className="font-mono text-sm">{p.name}</Link>
              <span className="text-xs text-muted">{p.prompt_id}</span>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => rename(p)} aria-label="Rename" className="p-2 text-muted hover:text-fg">
                <Pencil className="size-4" />
              </button>
              <button type="button" onClick={() => remove(p)} aria-label="Delete" className="p-2 text-muted hover:text-red-400">
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Verify**

```bash
pnpm dev
```

Visit `/presets`. After creating presets in detail page, list appears here; rename/delete works.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(presets): management page (rename + delete)"
```

---

## Task 15: Settings Page + Logout

**Files:**
- Create: `app/(app)/settings/page.tsx`
- Create: `app/api/auth/signout/route.ts`

- [ ] **Step 1: Create signout route**

`app/api/auth/signout/route.ts`:

```ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"), { status: 303 });
}
```

- [ ] **Step 2: Create settings page**

`app/(app)/settings/page.tsx`:

```tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const login = user?.user_metadata?.user_name ?? user?.email;

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6">
      <h1 className="font-mono text-xl">Settings</h1>
      <section className="flex flex-col gap-2">
        <h3 className="text-xs font-mono text-fg/70 uppercase">Account</h3>
        <p className="font-mono text-sm">登入身份: {login}</p>
        <form action="/api/auth/signout" method="post">
          <button
            type="submit"
            className="bg-red-500/20 text-red-300 px-4 py-2 rounded font-mono text-sm"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
```

- [ ] **Step 3: Verify**

Visit `/settings`. See logged-in identity, sign out works.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(settings): account display + sign out"
```

---

## Task 16: PWA Manifest + Icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png` (placeholder)

- [ ] **Step 1: Create manifest.json**

`public/manifest.json`:

```json
{
  "name": "Prompt Hub",
  "short_name": "Prompts",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#0a0a0a",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate placeholder icons**

For MVP, use a simple solid square with "P" using ImageMagick (or any tool):

```bash
# If ImageMagick available:
mkdir -p public/icons
magick -size 512x512 xc:#0a0a0a -fill "#10b981" -gravity center -pointsize 280 -annotate 0 "P" public/icons/icon-512.png
magick public/icons/icon-512.png -resize 192x192 public/icons/icon-192.png
magick public/icons/icon-512.png -resize 180x180 public/icons/apple-touch-icon.png
```

If ImageMagick is not available, manually create three PNG files (any solid-color square will do for now; user replaces with branded icons later).

- [ ] **Step 3: Add apple-touch-icon link in app/layout.tsx**

Already covered by `appleWebApp` metadata; verify `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />` is present in HTML head (Next.js adds it auto when file exists at conventional path; if not, add to `metadata.icons`).

Update `app/layout.tsx` metadata:

```tsx
export const metadata: Metadata = {
  title: "Prompt Hub",
  description: "Personal prompt management for AI workflows",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Prompt Hub" },
};
```

- [ ] **Step 4: Verify on mobile**

Deploy or use ngrok to expose `pnpm dev` over HTTPS. On iOS Safari: 分享 → 加到主畫面 → icon 出現，全螢幕模式運作。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(pwa): manifest + icons + add-to-home-screen support"
```

---

## Task 17: E2E Test (Playwright Main Path)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/main-flow.spec.ts`

- [ ] **Step 1: Create playwright config**

`playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "Desktop Chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 60_000 },
});
```

- [ ] **Step 2: Create E2E test (auth-bypass mode for testing)**

For MVP, this test runs against a local dev server with a pre-seeded auth cookie. Document the manual seed step in the test header.

`tests/e2e/main-flow.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

// Prerequisite: log in once via browser, then export the supabase auth cookie.
// Save to E2E_AUTH_COOKIE env var before running:
//   E2E_AUTH_COOKIE='sb-...=...' pnpm test:e2e
// In CI we'd seed via service-role; for MVP local + manual is fine.

test.beforeEach(async ({ context }) => {
  const cookie = process.env.E2E_AUTH_COOKIE;
  if (!cookie) test.skip(true, "E2E_AUTH_COOKIE not set");
  const [name, value] = cookie!.split("=");
  await context.addCookies([{ name, value, url: "http://localhost:3000" }]);
});

test("home → prompt detail → fill → copy", async ({ page, browserName }) => {
  await page.goto("/prompts/factor-research/brainstorm/factor-brainstorm-parallel");
  await expect(page.getByText("因子發想-多Agent平行Prompt")).toBeVisible();

  // Fill PHASE_N
  await page.getByLabel("Phase 編號").fill("10");

  // Click copy
  await page.getByRole("button", { name: /COPY/ }).click();

  // Toast appears
  await expect(page.getByText(/已複製/)).toBeVisible();
});

test("home shows last action after copy", async ({ page }) => {
  await page.goto("/prompts/factor-research/brainstorm/factor-brainstorm-parallel");
  await page.getByRole("button", { name: /COPY/ }).click();
  await page.goto("/");
  await expect(page.getByText("因子發想-多Agent平行Prompt")).toBeVisible();
});
```

- [ ] **Step 3: Install playwright browsers**

```bash
pnpm exec playwright install --with-deps
```

- [ ] **Step 4: Run E2E (after manual cookie setup)**

```bash
E2E_AUTH_COOKIE='<your sb cookie>' pnpm test:e2e
```

Expected: tests pass (or skip if no cookie).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "test(e2e): playwright main-path coverage (desktop + mobile viewports)"
```

---

## Task 18: README Refresh + Deployment Checklist

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Append deployment section to README.md**

Add to bottom of `README.md`:

```markdown
---

## Web App (Prompt Hub)

This repo doubles as the content source for a Next.js app on Vercel that surfaces prompts as forms with copy-ready output.

### Local Development

```bash
pnpm install
cp .env.example .env.local   # fill Supabase + GitHub allowlist values
pnpm validate:prompts        # sanity check frontmatter
pnpm build:search            # generate search index
pnpm dev                     # http://localhost:3000
```

### Deployment

1. **Supabase**: create project → SQL Editor → run `supabase/migrations/0001_init.sql` → enable GitHub OAuth provider in Auth settings
2. **Vercel**: import this GitHub repo → set env vars from `.env.example` → deploy
3. **Allowlist**: set `ALLOWED_GITHUB_LOGINS=<comma-separated GitHub logins>` in Vercel env

Updates to prompts: `git push` triggers Vercel rebuild + ISR revalidate. New prompts appear within 60 seconds.

### Adding a New Prompt

1. Create `prompts/<category>/<slug>.md` with frontmatter (id, title, category, tags, placeholders)
2. `pnpm validate:prompts` to catch frontmatter errors locally
3. Commit + push

### Adding a New Operator

1. Add their GitHub login to `ALLOWED_GITHUB_LOGINS` env var on Vercel
2. Redeploy (or just save — Vercel reuses build but new env applies on next request)

See `docs/superpowers/specs/2026-04-27-prompt-hub-design.md` §11 for full usage guide.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: web-app deployment + operator guide in README"
```

---

## Self-Review Notes

**Spec coverage check:**
- §2 architecture → Tasks 1, 6, 7, 8 ✓
- §3.1 prompt format → Task 0 ✓
- §3.2 placeholder types → Task 2 ✓ (5 MVP, 5 stubbed in registry)
- §3.3 Supabase schema → Task 6 ✓
- §4 tiered search → Tasks 5, 13 ✓
- §5 mobile UX → Tasks 10, 11, 12, 13 ✓
- §6 pages → Tasks 11, 12, 14, 15 ✓
- §7 workflow + error handling → Tasks 4, 8, 10 (clipboard fallback) ✓
- §8 testing → Tasks 2, 3, 9, 10, 17 ✓
- §9 tech stack → Task 1 ✓
- §10 project structure → matches "File Structure" header ✓
- §11 usage guide → Task 18 references the spec ✓

**Placeholder scan:** No "TBD"/"TODO"/"add appropriate" patterns. All code blocks contain complete content.

**Type consistency check:** `PlaceholderSchema` discriminated union used identically in Tasks 2, 3, 9. `PromptDoc` defined in Task 3, used in Tasks 4, 5, 11. `SearchDoc` defined in Task 5, consumed in Task 13.

**Known limits accepted:**
- Task 17 E2E uses manual cookie seed (proper auth seeding via service role is post-MVP)
- Task 16 icons are placeholders (user can re-design)
- 5 placeholder types stubbed in Task 2 registry but not implemented in form (Task 9) — falls back to "(type X not yet implemented)" message; future task adds them

---

**End of Plan**
