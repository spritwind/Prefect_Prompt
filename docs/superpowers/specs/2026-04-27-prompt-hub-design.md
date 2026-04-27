# Prompt Hub — Design Spec

**Date:** 2026-04-27
**Status:** Approved (brainstorming complete, awaiting user spec review)
**Owner:** leo.chang
**Repo:** `Prefect_Prompt`

---

## 1. Goal

建立一個部署於 Vercel 的個人 Prompt 管理網站，讓使用者（你 + 少數信任 operator）可以：

1. **整理與分類**現有 prompt 資產（目前 3 份量化研究 prompt，未來擴充至其他主題）
2. **手機快速複製** prompt 到行動裝置上的 AI app（Claude / ChatGPT / Gemini）作為 mobile-first 工作流程
3. **儲存個人化 preset**（已填好的 placeholder 組合），桌機建立、手機載入、一鍵複製
4. 由 AI agent（Claude Code）透過既有 git 工作流新增/修改 prompt，**網站本身不暴露寫入 API**

非目標（YAGNI）：
- 公開分享 / 社群協作
- Prompt marketplace
- 內建 AI 對話介面（網站只是 prompt 倉庫，不是 chat client）
- Offline-first / service worker
- 跨組織 multi-tenancy

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (desktop / mobile, PWA-installable)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Next.js 15 App Router (Vercel)                           │  │
│  │  ─ RSC reads prompt MD from GitHub at build/ISR           │  │
│  │  ─ Client form fills placeholders, copy-to-clipboard      │  │
│  │  ─ Static search-index.json on CDN (lazy-loaded)          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
        │                    │                    │
        │ Auth               │ Read prompts       │ Read/Write presets
        ▼                    ▼                    ▼
┌────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│ Supabase Auth  │  │ GitHub repo      │  │ Supabase Postgres    │
│ (GitHub OAuth  │  │ Prefect_Prompt   │  │ tables: presets,     │
│  + allowlist)  │  │ (SSOT)           │  │   recent_uses        │
└────────────────┘  └──────────────────┘  └──────────────────────┘
                            ▲
                            │ git commit/push
                    ┌───────┴────────┐
                    │ You / AI agent │
                    │ (Claude Code)  │
                    └────────────────┘
```

### Storage 分工原則

| 資料類型 | SSOT | 理由 |
|---------|------|------|
| Prompt 內容 + schema | **GitHub repo (git)** | 高 audit 需求、低更新頻率、與既有量化研究 commit 文化一致 |
| Preset (使用者填好的組合) | **Supabase Postgres** | 高更新頻率、跨裝置同步、git 不適合作個人狀態 |
| 最近使用紀錄 | **Supabase Postgres** | 同上 |
| 上次選擇的 preset id | **localStorage** | 完全 device-local、不需同步到其他裝置 |

### Auth 模型

- Supabase Auth + GitHub OAuth provider
- Allowlist middleware：登入後檢查 `auth.user.user_metadata.user_name` 是否在 `ALLOWED_GITHUB_LOGINS` env var
- 不在名單即 sign out 並顯示「未授權」靜態頁
- 名單變動 = 改 env var（Vercel UI 一鍵 redeploy 即生效），不動 code

### 寫入路徑

**Prompt：** 完全不經過網站。
```
編輯者（你 or Claude Code） → git commit → git push
  → Vercel webhook → rebuild → search-index.json regen + ISR revalidate
  → 5-60 秒後網站讀到新版
```

**Preset：** 網站 → Supabase（單一寫入路徑，RLS 保護）。

---

## 3. Data Model

### 3.1 Prompt 檔案格式

每個 prompt = 一個 `.md`，frontmatter 定義 metadata + placeholder schema。

**目錄結構：**
```
prompts/
  factor-research/
    brainstorm/
      factor-brainstorm-parallel.md
    backtest/
      entry-factor-backtest.md
      exit-factor-backtest.md
  general/
    （未來其他類型）
```

**Frontmatter schema：**
```yaml
---
id: factor-brainstorm-parallel       # slug, immutable, unique across repo
title: 因子發想-多Agent平行Prompt
category: factor-research/brainstorm  # 對應資料夾路徑
tags: [production, parallel-agent, phase-9]
description: 8 大 lane 平行廣度發想 candidate factors
estimated_time: "60-120 min/agent"
agent_count: "6-8 (parallel)"
placeholders:
  PHASE_N:
    type: number
    label: Phase 編號
    default: 9
    suggestions: [8, 9, 10]
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
    hint: 大 lane 90 / 小 lane 60
  N_FACTORS_TARGET:
    type: number
    label: final 因子數
    default: 20
    hint: 大 lane 20 / 小 lane 10 (整體 < 30)
---

# Prompt 本文（保留原 markdown，含 {PHASE_N} / {LANE_X} 等 placeholder）
...
```

### 3.2 Placeholder Type System

10 種 type，前 5 種 MVP 實作，後 5 種留 type registry 擴展點。

| # | type | UI 控件 | 用途範例 | MVP |
|---|------|--------|---------|-----|
| 1 | `text` | input | 短字串 | ✅ |
| 2 | `multiline` | textarea | 長段落、JSON 片段 | ✅ |
| 3 | `number` | number input | Phase 編號、時間預算 | ✅ |
| 4 | `select` | dropdown | Lane 名稱、固定選項 | ✅ |
| 5 | `boolean` | toggle | 是否開啟某 flag | ✅ |
| 6 | `multiselect` | chips | 多 tag、多 lane 同時選 | ⏳ |
| 7 | `date` | date picker | 對齊日期、deadline | ⏳ |
| 8 | `code` | monaco mini editor + lang hint | Python/SQL 片段 | ⏳ |
| 9 | `list` | dynamic add/remove rows | 任意長度字串陣列 | ⏳ |
| 10 | `file-ref` | autocomplete from git tree | 引用 repo 內檔案路徑 | ⏳ |

**實作策略：** `lib/placeholders/types.ts` 用 discriminated union + registry pattern，每種 type 有 `{ render, validate, serialize, default }` 四個 method。新增一種 = 加一個檔案 + 註冊一行，不動主流程。

### 3.3 Supabase Postgres Schema

```sql
create table presets (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  prompt_id    text not null,
  name         text not null,
  values       jsonb not null,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index presets_user_prompt_idx on presets(user_id, prompt_id);

create table recent_uses (
  user_id      uuid not null references auth.users(id) on delete cascade,
  preset_id    uuid references presets(id) on delete cascade,
  prompt_id    text not null,
  used_at      timestamptz default now(),
  primary key (user_id, prompt_id, preset_id)
);

alter table presets enable row level security;
alter table recent_uses enable row level security;
create policy "own presets" on presets for all using (auth.uid() = user_id);
create policy "own recent" on recent_uses for all using (auth.uid() = user_id);
```

**設計決策：**
- `prompt_id` 是 `text` 不是 FK — prompt 在 git，DB 不該有 mirror table
- 沒有 `prompts` table、沒有 `users` table（用 `auth.users`）、沒有 audit log（YAGNI）
- 軟連結：若 prompt 被刪/改 id，preset 顯示「prompt 不存在」即可，不阻塞 DB

---

## 4. Search Architecture (Tiered Search)

```
Build-time:
  ─ Parse all prompts/**/*.md
  ─ Generate /public/search/index.json (MiniSearch pre-built index)
  ─ CDN-cacheable static asset

Runtime tier 1: Personal cache (instant, 0ms)
  ─ recent_uses + presets hydrated to localStorage
  ─ Command palette 開啟瞬間先 match 這層

Runtime tier 2: Static index (lazy-loaded, ~50ms)
  ─ 只在 / route 開命令面板時 dynamic import('search/index.json')
  ─ MiniSearch in-memory，搜 title/tags/category/description
  ─ 其他頁面不載入

Runtime tier 3: Edge fulltext (on-demand, ~150ms) [post-MVP]
  ─ Vercel Edge Function /api/search?q=...&body=true
  ─ 從 GitHub raw fetch 對應檔內文做 grep（cached on Edge KV）
  ─ MVP 不做，留 hook
```

**為什麼選 tiered：**
- 零 bundle 污染（索引是 static asset，不進 JS bundle）
- Route-segment lazy load（只有開搜尋的 user 才下載）
- CDN cache hit（Vercel Edge 全球 cache <50ms TTFB）
- 個人化排序天然支援（tier 1 永遠優先）
- git push → 自動重 build → 索引自動更新
- 內文搜尋直接加 tier 3，不重寫前端

---

## 5. Mobile UX Design

### 5.1 設計核心翻轉

**反例（CMS browser 思維）：** 首頁 = 資料夾 tree + tag filter + search bar。錯，這是桌機編輯者 mental model。

**正解（Resumption 思維）：** 90% 場景是「**我剛剛跟 AI 對話到一半，現在要把 prompt 傳到手機 AI 上繼續**」。Home 應該是「繼續上次」，不是 CMS browser。

→ **Preset 是名詞，prompt 是 namespace。** Home 顯示 saved invocations，不是 prompt list。

### 5.2 手機 Home 畫面

```
┌────────────────────────────────────────┐  全螢幕暗色 (#0a0a0a)
│                                        │
│   ⌘ Phase 9 · Lane 3 · 籌碼-分點         │  上次 preset, hero 字級
│   factor-brainstorm-parallel · 2分鐘前   │
│                                        │
│   ┌────────────────────────────────┐  │
│   │      📋  COPY  (2,341 字)       │  │  巨型 primary action
│   │                                │  │  thumb zone 正中央
│   └────────────────────────────────┘  │  touch target 64pt
│                                        │
│   ─────────  Recent  ─────────         │  最近 3-5 個 preset
│   • Phase 9 · Entry · 5min     ↗      │
│   • Phase 9 · Exit · Tier1     ↗      │
│   • Phase 8 · Lane 1 · 法人面   ↗      │
│                                        │
│   ╲╱  下拉搜尋全部  ╲╱                  │  pull-to-search hint
│                                        │
└────────────────────────────────────────┘
```

### 5.3 設計決策清單

| # | 決策 | 為什麼 |
|---|------|------|
| 1 | Home = Last Action surface，不是 CMS list | 開啟→1 tap→完成，中位數 <2 秒 |
| 2 | 沒有 bottom nav、沒有 sticky search bar | 只有 1 個主目的地（Copy），加 nav 就是加 chrome |
| 3 | Pull-to-search = 命令面板 | 釋放 home 上方空間給「上次用的」hero |
| 4 | 編輯 placeholder = bottom sheet，不換頁 | 換頁打斷 spatial memory |
| 5 | 沒填 placeholder 不擋 copy | 半填狀態也常 copy 到 AI 看效果 |
| 6 | Tap = 填好版 / 長按 = 原始模板 | 雙 mode，power user 不卡 |
| 7 | Copy dopamine: vibrate + flash + toast | 0.3 秒反饋是 emotional core |
| 8 | Geist Mono / dark default / emerald accent | dev/AI 工具直覺 |
| 9 | PWA 加到主畫面 = 原生感 90%，不做 service worker | YAGNI |
| 10 | 桌機 ≠ 手機放大版 | 桌機 IA 是「編輯與管理」，手機 IA 是「消費與複製」 |

### 5.4 桌機 vs 手機

| 維度 | 桌機 | 手機 |
|------|------|------|
| 主要任務 | 編輯、管理、建 preset | 消費、複製 |
| Home | sidebar (folder tree + tags) + 主區雙欄 | Last Action hero + recent list |
| 搜尋 | `Cmd+K` 命令面板 | Pull-to-search 命令面板（同 component） |
| Prompt 詳情 | form 左、preview 右並列 | form 為 bottom sheet，preview 折疊 |

### 5.5 互動細節

**Copy interaction：**
```js
async function onCopy(text: string) {
  await navigator.clipboard.writeText(text);
  navigator.vibrate?.(10);
  // 全螢幕短暫綠色 flash overlay (200ms)
  // Toast: "✓ 已複製 N,NNN 字" 1.5s
  // POST /api/recent-uses (fire-and-forget)
}
```

**Fallback：** 非 HTTPS / 舊 iOS 沒 `navigator.clipboard` → `document.execCommand('copy')` + 提示「請手動長按複製」。

**Typography：**
- Body: Geist Sans
- Preset 名稱 / prompt 內文: Geist Mono 14px line-height 1.6
- Color: bg `#0a0a0a` / text `#ededed` / accent `#10b981`
- Light mode: 跟隨 `prefers-color-scheme`

---

## 6. Pages

```
/                           Home: Last Action + Recent + folders/tags
/prompts/[...slug]          Prompt 詳情 + 表單 + preset 載入器
/presets                    我的 preset 管理 (重命名 / 刪除 / 排序)
/login                      GitHub OAuth 登入
/settings                   登入狀態、登出、theme 切換
```

---

## 7. Workflow & Error Handling

### 7.1 三個關鍵 workflow

**(a) 新增/修改 prompt：**
```
1. 在 Prefect_Prompt repo 開檔: prompts/<category>/<slug>.md
2. 寫 frontmatter + 本文
3. git commit + push
4. Vercel rebuild → search-index regen → ISR revalidate
5. 5-60 秒後網站看到新版
```

**(b) 桌機建 preset：**
```
1. /prompts/<slug> → 填表單 → Save as Preset → 命名
2. POST /api/presets → Supabase insert
3. UI 加進 preset list
```

**(c) 手機複製：**
```
1. Home 從 localStorage hydrate「上次 preset」(0ms)
2. 背景 fetch Supabase recent_uses 確認
3. tap Copy → clipboard + vibrate + flash + toast
4. POST /api/recent-uses (fire-and-forget)
```

### 7.2 Error Handling

| 層級 | 錯誤 | 處理 |
|------|------|------|
| Build | YAML parse / 重複 id / 缺欄位 | Build fail, 舊站續運作 |
| Auth | OAuth callback 失敗 | 導 `/login?error=oauth` |
| Auth | 不在 allowlist | sign out + 顯示「未授權」 |
| Auth | session 過期 | Middleware 重導 `/login` |
| GitHub fetch | rate limit / 500 | ISR 用上次 cache + banner |
| Supabase | preset CRUD 失敗 | Toast retry + localStorage 暫存 |
| Clipboard | API 不可用 | Fallback execCommand + 提示 |
| Network | 完全斷線 | localStorage hydrate 仍可 copy |

### 7.3 Build-time Validators

`scripts/validate-prompts.ts` 跑在 `pnpm build` 前，CI 也跑：
- frontmatter YAML 解析
- `id` 全 repo 唯一
- `placeholders` 引用一致（內文 `{XXX}` 對應 frontmatter 定義）
- `category` 路徑與檔案實體位置一致

任一失敗 → build fail，舊站續運作。

---

## 8. Testing 策略

- **Unit**：`lib/placeholders/*` type render/validate（Vitest）
- **Build-time validator**：`scripts/validate-prompts.ts`（CI + pre-build）
- **Component**：Vitest + Testing Library 測表單、preset list、命令面板
- **E2E**：Playwright 跑 main path（登入 → 進 prompt → 填表 → save → home → copy），桌機 + mobile viewport
- **不做**：visual regression、跨瀏覽器矩陣、load test

---

## 9. Tech Stack

```
Framework:     Next.js 15 (App Router) + React 19 + TypeScript 5
Styling:       Tailwind CSS 4 + Geist font (Sans + Mono)
UI primitives: Radix UI (Sheet, Dialog, Toast)
Auth:          @supabase/ssr
DB client:     @supabase/supabase-js
Markdown:      gray-matter (frontmatter) + react-markdown (preview)
Search:        MiniSearch
Icons:         Lucide React
Testing:       Vitest + Testing Library + Playwright
Lint/format:   Biome
```

### Env vars

```
GITHUB_PAT=ghp_xxx                    # read-only PAT
GITHUB_REPO=leo-chang/Prefect_Prompt
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_GITHUB_LOGINS=leo,operator1
```

---

## 10. Project Structure

```
Prefect_Prompt/
├── prompts/                          # SSOT prompt 內容（git tracked）
│   ├── factor-research/
│   │   ├── brainstorm/
│   │   ├── backtest/
│   ├── general/
├── app/                              # Next.js App Router
│   ├── (auth)/login/page.tsx
│   ├── (app)/
│   │   ├── page.tsx                  # Home: Last Action surface
│   │   ├── prompts/[...slug]/page.tsx
│   │   ├── presets/page.tsx
│   │   ├── settings/page.tsx
│   ├── api/
│   │   ├── presets/route.ts
│   │   ├── recent-uses/route.ts
│   ├── layout.tsx
│   ├── middleware.ts                 # auth + allowlist
├── components/
│   ├── home/LastActionHero.tsx
│   ├── home/RecentList.tsx
│   ├── prompt/PlaceholderForm.tsx
│   ├── prompt/PreviewPane.tsx
│   ├── prompt/CopyButton.tsx
│   ├── command-palette/CommandPalette.tsx
│   ├── ui/                           # Radix wrappers (sheet, dialog, toast)
├── lib/
│   ├── placeholders/
│   │   ├── types.ts                  # discriminated union + registry
│   │   ├── render.ts
│   │   ├── validate.ts
│   ├── github.ts                     # Octokit fetch helpers
│   ├── supabase/
│   │   ├── server.ts
│   │   ├── client.ts
│   ├── search/
│   │   ├── build-index.ts            # build-time
│   │   ├── client.ts                 # runtime
├── scripts/
│   ├── validate-prompts.ts
│   ├── build-search-index.ts
├── public/
│   ├── search/index.json             # generated at build
│   ├── manifest.json                 # PWA
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init.sql
├── docs/
│   └── superpowers/specs/2026-04-27-prompt-hub-design.md
├── tests/
├── package.json
├── next.config.ts
├── tsconfig.json
├── biome.json
└── README.md
```

---

## 11. 使用說明（Onboarding & 日常操作手冊）

### 11.1 First-time Setup（一次性）

**部署者（你）：**

1. 在 Supabase 建專案，跑 `supabase/migrations/0001_init.sql`
2. Supabase Dashboard → Authentication → Providers → GitHub → 啟用
3. GitHub Settings → Developer Settings → Fine-grained PAT，scope: read-only on `Prefect_Prompt` repo
4. Vercel import GitHub repo，填 env vars（見 §9）
5. Domain 綁 `prompt.<your-domain>` 或用 Vercel default
6. 第一次手機開站 → 登入 → 「加到主畫面」

**Operator（信任的人）：**

1. 你把對方 GitHub login 加進 `ALLOWED_GITHUB_LOGINS` env var → Vercel redeploy
2. 對方開站 → GitHub OAuth 登入 → 進入

### 11.2 日常操作

#### A. 新增 prompt（你 or AI）

**Path 1: 手動**
```bash
cd Prefect_Prompt
mkdir -p prompts/<category>/<subcategory>
$EDITOR prompts/<category>/<subcategory>/<slug>.md
# 寫 frontmatter (id 唯一) + 本文
git add . && git commit -m "feat: add <slug> prompt" && git push
# 等 60 秒，網站自動上架
```

**Path 2: 請 Claude Code**
```
"幫我把這份 prompt 加到 Prefect_Prompt repo
分類放 factor-research/brainstorm
id 用 phase-10-factor-brainstorm
然後 commit + push"
```

Claude Code 會自動產 frontmatter + commit + push。

#### B. 桌機建 preset

1. 開站 → 登入
2. 點側邊欄找 prompt → 進入詳情頁
3. 填表單（placeholder 變 input 欄位）
4. 右上角「💾 Save as Preset」→ 命名（建議格式：`Phase 9 · Lane 3 · 籌碼-分點`）
5. 完成

#### C. 手機快速複製（核心使用情境）

1. 主畫面點 PWA icon
2. Home 直接顯示「上次 preset」+ 巨型 Copy 按鈕
3. 如果就是要這個 → tap **Copy** → 振動 + flash + toast「已複製」
4. 切到 Claude/ChatGPT app → 貼上

切換 preset：
1. 在 home 下拉螢幕（pull-to-search）
2. 命令面板出現，輸入關鍵字（例如 `entry`）
3. 點結果 → home 重新 hydrate → tap Copy

微調 placeholder：
1. Home 點 preset 名稱旁的 ✏️
2. Bottom sheet 滑出，改欄位
3. Sheet 底部 Copy 按鈕一鍵複製

#### D. 管理 preset

`/presets` 頁面：
- 重命名
- 刪除
- 拖曳排序（排在前面的會在 home recent list 優先）

#### E. Operator 加/移除

- **加：** 把對方 GitHub login 加進 Vercel env var `ALLOWED_GITHUB_LOGINS`，redeploy
- **移：** 從 env var 移除，redeploy。對方下次 session 過期就被擋

### 11.3 Cheatsheet

| 想做什麼 | 路徑 |
|---------|------|
| 加新 prompt | git commit + push 到 `prompts/<category>/<slug>.md` |
| 改 prompt 內容 | 同上 |
| 改 prompt 分類 | `git mv` 到新資料夾 + 改 frontmatter `category` |
| 改 prompt id | **不要改**（會 break 所有引用此 id 的 preset）|
| 建 preset | 桌機 `/prompts/<slug>` → Save as Preset |
| 用 preset | 手機 home → tap Copy |
| 微調後複製 | 手機 home → ✏️ → 改欄位 → sheet 內 Copy |
| 複製原始模板（含 placeholder） | 長按 Copy 按鈕 |
| 搜尋 | 桌機 `Cmd+K` / 手機下拉 |
| 加新 operator | Vercel env var + redeploy |

### 11.4 Troubleshooting

| 症狀 | 原因 | 解法 |
|------|------|------|
| 手機 Copy 按下沒反應 | `navigator.clipboard` 在 HTTP 上不可用 | 檢查網域是 HTTPS（Vercel default 已是） |
| 新加的 prompt 沒出現 | Vercel build 失敗 | 看 Vercel dashboard build log，通常是 frontmatter YAML 語法錯 |
| 登入後馬上被踢出 | 不在 allowlist | 確認 `ALLOWED_GITHUB_LOGINS` 含你的 GitHub login |
| Preset 顯示「prompt 不存在」 | prompt id 被改或檔案被刪 | 重建 preset 或還原 prompt id |
| Search 結果不全 | 索引尚未更新 | 等下次 Vercel rebuild（push 後 60 秒內） |
| 手機 PWA 顯示舊版 | Service worker（無）/ 瀏覽器 cache | 下拉重新整理 |

### 11.5 嚴禁

- 改 prompt frontmatter 的 `id`（會 break preset 引用）
- 直接在 Supabase Dashboard 改 `presets.values`（用網站 UI 改才有 validation）
- Push 含 secrets 的 commit（用 Vercel env var）
- 把 `ALLOWED_GITHUB_LOGINS` 設成空字串（=任何人可登入）

---

## 12. 不在這個 spec 範圍

- 從 0 寫具體 component 程式碼 → 由後續 implementation plan 處理
- prompt 內容遷移腳本（把現有 3 個 MD 加 frontmatter） → 屬於 implementation plan 第一個 task
- CI/CD pipeline 細節（GitHub Actions / Vercel build hooks） → 採 Vercel default + 一個 lint workflow 即可
- 監控與告警 → 個人專案規模，先靠 Vercel 內建即可

---

**End of Spec**
