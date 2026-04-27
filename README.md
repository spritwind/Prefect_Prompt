# Prefect_Prompt — 因子研究 Prompt 系統化管理

> AITradingAgents 處置股策略量化研究流程的 production-ready prompt templates.
> 對齊 commit `26c9a4b` (2026-04-27) Stage 1 leak fix clean panel.

---

## 三個 Prompt 概覽

| 檔案 | 用途 | 派 agent 數 | 預計時間 |
|------|------|------------|----------|
| **prompts/factor-research/brainstorm/factor-brainstorm-parallel.md** | 8 大 lane 平行廣度發想 | 6-8 (parallel) | 60-120 min/agent |
| **prompts/factor-research/backtest/entry-factor-backtest.md** | T+2 進場 5 層 QA 回測 | 4 | 4-8 hr |
| **prompts/factor-research/backtest/exit-factor-backtest.md** | T+N 提前出場 7 層 QA 回測 | 4 | 6-8 hr |

---

## 何時用哪個 Prompt

```
新 Phase 起跑
    │
    ├── Step 1: 廣度發想 candidate
    │   └─→ 用 01_因子發想-多Agent平行Prompt.md
    │       8 lane parallel, 限 < 30 final factors (m_eff blow up 鐵則)
    │
    ├── Step 2: 整理 brainstorm output
    │   └─→ 排序 priority + dedupe → phase{N}_factors_to_test.json
    │
    └── Step 3: 嚴謹 backtest
        ├── entry-side (T+2 進場 rescue/exclude) → 02 prompt
        └── exit-side (T+N 提前出場) → 03 prompt
```

### Decision Tree

| 因子類型 | Prompt |
|---------|--------|
| 進場 rescue (factor hit → STRONG_BUY) | **02 entry** |
| 進場 exclude (factor hit → SKIP) | **02 entry** |
| 提前出場 (T+N exit, N=2~9) | **03 exit** |
| 主力成本 / 籌碼分布 (需新 panel) | **02 entry** + Panel Builder phase 先跑 |

---

## 替換 Placeholder 指南

### 01 brainstorm prompt

| 變數 | 說明 | 建議值 |
|------|------|--------|
| `{PHASE_N}` | Phase 編號 | 8 / 9 / 10 |
| `{LANE_X}` | Lane 編號 | 1-8 |
| `{LANE_NAME}` | Lane 名稱 | 法人面 / 籌碼-分點 / 基本面財務 / 技術面動能 / 微結構 / 總體產業 / 事件 / 跨母體 |
| `{TIME_BUDGET_MIN}` | 時間預算 | 大 lane 90 / 小 lane 60 |
| `{N_FACTORS_TARGET}` | final 因子數 | 大 lane 20 / 小 lane 10 (整體 < 30) |

### 02 entry backtest prompt

| 變數 | 說明 | 建議值 |
|------|------|--------|
| `{PHASE_N}` | Phase 編號 | 8.2 / 9 / 10 |
| `{N_TEST_AGENTS}` | 測試 agent 數 | 3-5 |
| `{AGENT_X}` | Agent 編號 | A / B / C |
| `{AGENT_NAME}` | Agent 名稱 | 5min 測試員 / 20min 測試員 / 跨母體測試員 |
| `{INTERVAL}` | 母體 | 5 / 20 / cross |
| `{TIME_BUDGET_HR}` | 時間預算 | 4-6 hr |
| `{N_FACTORS_TO_TEST}` | 預期測試數 | 30-80 |
| `{BRAINSTORM_INPUT}` | brainstorm output | scripts/phase{N}_brainstorm_*.json |

### 03 exit backtest prompt

| 變數 | 說明 | 建議值 |
|------|------|--------|
| `{AGENT_X}` | Agent 編號 | P9_A / P9_B / P9_C |
| `{AGENT_NAME}` | Agent 名稱 | Tier1 R counter / Tier2 macro / Tier3 個股 |
| `{TIME_BUDGET_HR}` | 時間預算 | 8 hr |

---

## 跟原版 docs/templates/ 對應關係

新檔位於 Prefect_Prompt/, 原英文版保留在 AITradingAgents/docs/templates/ 作為 reference.

| 新 (中文系統化) | 原 (reference) | 主要變動 |
|----------------|---------------|----------|
| 01_因子發想-多Agent平行Prompt.md | docs/templates/agent_factor_brainstorming_prompt.md | Quick Reference + baseline 升級 + m_eff 611 + R-B11 T+0 + R-B12 信心不代替論證 + broker 三路徑 + Panel Builder 鐵則 |
| 02_因子回測-Entry入場因子Prompt.md | docs/templates/agent_factor_backtest_prompt.md | Quick Reference + clean panel baseline +2.13/+2.64 + paired delta CI 強制 + Phase 8.2 五輪 QA 教訓 (Train 反向降 BADGE / 跨檔一致性 / 邊際 vs CI 寬度) + FinMind publish_date offset / Phase 11 Panel Builder + R12 信心不代替論證 |
| 03_因子回測-Exit提前出場因子Prompt.md | docs/templates/agent_phase9_exit_backtest_prompt.md | Quick Reference + Phase 9 BACK-LOADED 教訓 + 7 層 QA (含 L6/L7 動態 normalize) + Phase 11 Panel Builder + R12 信心不代替論證 + paired delta CI / FinMind offset |

**原版不刪** — 留作歷史 reference + audit 對照.

---

## 對齊狀態 (2026-04-27)

| 項目 | 值 | 來源 |
|------|---|------|
| 對齊 commit | `26c9a4b` | git log |
| 對齊日期 | 2026-04-27 | Stage 1 leak fix clean panel |
| Production version | v4h Step 2 | composite_meta_constants.py CURRENT_VERSION |
| 5min STRONG Val Sh | +2.13 (n=17) | STAGE1_PHASE6_VAL_METRICS |
| 20min STRONG Val Sh | +2.64 (n=54) | STAGE1_PHASE6_VAL_METRICS |
| Track A v4h Val Top30 | 1.99 | PRODUCTION_METRICS.tracks.A |
| Track B v4h Val Top30 | 2.29 | PRODUCTION_METRICS.tracks.B |
| SH_SCALE | sqrt(252/9) ≈ 5.292 | _sh_scale.py |
| m_eff 累積 | 611 (Phase 6+7+8.2+9+Round4.5 QA) | Bonferroni α = 8.18e-5 |

---

## 使用紀錄 / Changelog

### 2026-04-27 — Initial deploy (本次)
- 從 docs/templates/ 三個英文版優化 → 中文系統化版
- 升級 baseline 5min +2.25→+2.13 / 20min +3.09→+2.64 (Stage 1 leak fix clean panel)
- m_eff 累積從 270 → 611 (含 Phase 8.2 287 + Phase 9 30 + Round4.5 QA 24)
- 新增 Phase 9/11 教訓 section
- 新增 broker data 三路徑鐵則 (Backtest MSSQL / fallback cache / Live Supabase+FinMind)
- 強化 R12 採納權鐵則: baseline 對不上停, 信心不代替論證
- Panel Builder phase 鐵則 (Phase 11 BC_A/B push back 教訓)
- FinMind publish_date offset 鐵則 (Phase 8.2 QA-D leak 教訓)
- Phase 8.2 五輪 QA 教訓全納 (paired delta CI / Train 反向 / 跨檔一致性 / 邊際 vs CI 寬度)

### 累積教訓對照表

| Phase | 教訓 | 已納入 prompt |
|-------|------|--------------|
| Phase 6 | fail rate 10:1 是常態 | 02/03 R10 |
| Phase 7 | m_eff 多重檢定意識 | 01/02/03 R11 |
| Phase 8.2 (QA-A~E 5 輪) | paired delta CI / Train 反向 / 跨檔一致性 / 飽和論不武斷 / 邊際 vs CI 寬度 / FinMind publish_date | 02/03 全納 |
| Phase 9 | 處置股 alpha BACK-LOADED, 中段 weakness 是反彈前兆, 機械 stop loss 切右尾 | 03 全納 |
| Phase 11 | Panel Builder phase + equivalence gate, panel.pkl 必驗 size + content, R12 push back 工作 | 02/03 全納 |

---

## 完整工作流程範例

```
Phase 9 為例 (2026-04-27 已執行):

Day 1 morning:
1. 派 8 個 lane brainstorm agent (用 01 prompt)
   → 8 個 phase9_brainstorm_lane*_*.json (限 < 30 final)
2. Agent D 整理排序 → phase9_factors_to_test.json

Day 1 afternoon:
3. 判斷 entry vs exit:
   - entry-side → 派 4 個 agent 用 02 prompt (Agent A/B/C/D)
   - exit-side  → 派 4 個 agent 用 03 prompt (P9_A/B/C/Integrator)

Day 2:
4. 等 background notification
5. 整合員寫 phase9_adopted_factors.json + 前端整合
6. user 跑 _eval_phase9_integration.py 評估 IR 改善
7. 確認後 commit + push (整合員只 commit, user push)
```

---

## 嚴禁

- 改 docs/templates/ 既有檔 (保留英文 reference)
- 直接 push without user 確認
- 跳過 Step 0 baseline reproduce (R12 push back)
- 跳過 Panel Builder phase 直接跑新 panel 因子 (Phase 11 教訓)
- baseline 對不上假裝跑下去 (R12: 信心不代替論證)
- 報絕對 Sh CI 當顯著性證據 (必 paired delta CI)

---

## 維護備註

每次 production baseline 更新 (e.g. 新 panel rebuild / Stage 2 leak fix), 必同步更新:
1. 三個 prompt 的 Quick Reference 表
2. 本 README 的「對齊狀態」表
3. Changelog 加新 entry

來源 SSOT: scripts/composite_meta_constants.py (Python) + memory/track_ab_baselines.md (Markdown).
