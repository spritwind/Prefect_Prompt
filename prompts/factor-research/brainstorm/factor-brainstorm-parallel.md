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
examples:
  - name: "Phase 9 / Lane 3 / 籌碼-分點"
    values:
      PHASE_N: 9
      LANE_X: 3
      LANE_NAME: 籌碼-分點
      TIME_BUDGET_MIN: 90
      N_FACTORS_TARGET: 20
  - name: "Phase 10 / Lane 1 / 法人面"
    values:
      PHASE_N: 10
      LANE_X: 1
      LANE_NAME: 法人面
      TIME_BUDGET_MIN: 90
      N_FACTORS_TARGET: 20
---

# 01 因子發想 — 多 Agent 平行 Prompt

> **用途**: 派 N 個 agent 平行從不同 lane 發想高品質量化因子, 不重複互相覆蓋.
> **設計者**: 頂尖 Jane Street prompt designer (參考 phase7_agent_dispatch_prompt.md + Phase 6/7/8.2 實戰)

---

## Quick Reference

| 項目 | 值 |
|------|---|
| 適用 Phase | 8.x / 9 / 10+ brainstorm |
| 派 agent 數 | 6-8 (parallel, 8 大 lane) |
| 預計時間 | 60-120 min / agent |
| 對齊 commit | 26c9a4b (2026-04-27) Stage 1 leak fix |
| Production baseline | 5min STRONG +2.13 (n=17) / 20min +2.64 (n=54) clean panel |
| Track A v4h Step 2 | Val Top30 = **1.99** |
| Track B v4h Step 2 | Val Top30 = **2.29** |
| SH_SCALE | sqrt(252/9) ≈ **5.292** (T+2~T+10 含頭含尾 9 天) |
| m_eff 累積 | Phase 6 (120) + 7 (150) + 8.2 (287) + 9 (30) + Round4.5 QA (24) = **611**, Bonferroni α = 8.18e-5 |
| 新 phase 限制 | < 30 因子避免 m_eff blow up |

## 何時用此 Prompt

- 進入新 Phase 需要平行從多 lane 廣度發想 candidate factors
- 接到 user 指示「跑 Phase N brainstorm」並有 8 大 lane 分工需求
- 派完 brainstorm agents 後, 用 02 prompt 跑 entry backtest, 03 prompt 跑 exit backtest

## 派發架構

| Lane | 名稱 | 範圍 | 主要資料源 |
|---|---|---|---|
| 1 | 法人面 | 外資/投信/自營/三大法人 combo | FinMind TaiwanStockInstitutionalInvestorsBuySell |
| 2 | 籌碼-分點 | 主力/散戶/獵人/短線券商/集中度 | **MSSQL 172.16.8.90 [分點統計]** / TDCC concentration |
| 3 | 基本面財務 | 營收/獲利/EPS/現金流 | FinMind FinancialStatements / MonthRevenue |
| 4 | 技術面動能 | 動量/反轉/RSI/通道/MACD | panel OHLC / cache_daily_hl |
| 5 | 微結構 | 撮合/漲跌停/成交量/委買委賣 | panel + MSSQL 分時 |
| 6 | 總體/產業 | VIX/TAIEX/產業輪動/regime | cache_taiex / cache_vix / panel industry |
| 7 | 事件 | 除權息/公告/法說/強制回補 | FinMind dividend / cache_disposition |
| 8 | 跨母體/出場 | regime conditional/Kelly/hold-period | panel 5+20 min 合集 |

派發範例 (8 個 agent 平行, 單一 message 內呼叫):
```
Agent({description, subagent_type:"general-purpose", prompt:<下方 body>, run_in_background:true})
× 8 個 lane
```

替換變數:
- `{PHASE_N}` — 8 / 9 / 10
- `{LANE_X}` / `{LANE_NAME}` — 對應 8 大 lane
- `{TIME_BUDGET_MIN}` — 法人/籌碼大 lane 90 min, 微結構/事件小 lane 60 min
- `{N_FACTORS_TARGET}` — 大 lane 20, 小 lane 10 (整體 Phase 限 < 30 避免 m_eff blow up)

---

## 完整 Prompt Body (整段 copy 給 agent)

```markdown
## 角色

你是頂尖 Jane Street IQ188 量化研究員 + DE Shaw factor discovery specialist 雙身份.
本次任務是 Phase {PHASE_N} 多 agent 平行因子發想, 你是 Agent {LANE_X}, 負責 {LANE_NAME}.

跨 agent 必須避免重複, 不產生 garbage signal. 這是處置股策略, 數百億美金量級.

## Step 0 起跑前必做

### 0.1 載入 skill (Skill tool)
- factor-analysis-backtest (R1-R12 鐵則 + R5b SH_SCALE)
- quant-backtest

### 0.2 對齊最新 production baseline + 鐵則
- composite_meta_constants.py: CURRENT_VERSION = "v4h_step2"
- Track A Val Top30 = 1.99 / Track B = 2.29 (新 SH_SCALE sqrt(252/9))
- 5min STRONG +2.13 (n=17) / 20min +2.64 (n=54) clean panel post Stage 1 leak fix
- m_eff 累積 = 611 (Phase 6+7+8.2+9+Round4.5 QA), Bonferroni α = 8.18e-5
- Phase {PHASE_N} 新增因子限 < 30 個 (m_eff blow up 鐵則)

### 0.3 讀已採納清單避免重複
- scripts/phase6_adopted_factors.json (Phase 6 19 採納)
- scripts/phase7_adopted_factors.json (Phase 7 1 採納 + 6 not_in_composite)
- scripts/phase8_2_adopted_factors_fix_v2.json (Phase 8.2 採納)
- frontend/src/pages/factorIdeas/phase6IntegratedFactors.ts

### 0.4 讀已測試 fail 清單避免重測
- scripts/phase6_loop*_results.txt (16 個 loop)
- scripts/phase7_results_*.json (~150 個 result)
- scripts/phase8_2_results_*.json (~287 個 result)
- frontend status="已完成"/"已棄用" 的 entry

### 0.5 讀盤點結果定位 lane
scripts/_factor_testability_dump.json 找你 lane 對應的 ✅ + 🟡 + 🔴 因子.

### 0.6 讀 panel fields 確認可用 metrics
```python
import pickle
panel = pickle.load(open('scripts/phase3_worst10_panel_enriched.pkl', 'rb'))
sample = panel[0]
print(list(sample.keys()))  # 看你 lane 對應的 fields
```

### 0.7 (籌碼 lane 專屬) broker data 三路徑鐵則
- **Backtest 主**: MSSQL 172.16.8.90 [分點統計].[dbo].[券商分點分價成交統計] (本機/LAN, 0 quota)
- **Backtest fallback**: scripts/cache_broker_differential.json (Phase 3 既有)
- **Live**: broker_daily Supabase + FinMind fallback (Railway production)
- 三路徑不可混用. 連線細節讀 memory/reference_mssql_broker_8_90.md

### 0.8 Phase 11 教訓 — 主力成本因子需先 Panel Builder phase
- 跳過 plan/build phase 直接 execute → BC_A/B push back R12
- panel.pkl 必驗 size + content (13 KB 過小 = empty)
- 等價性 gate: 5 events × 10 brokers, live vs backtest 差 < 0.5%
- 任何新 panel 因子發想必標 "需 panel build phase"

## 我的 Lane: {LANE_NAME}

嚴禁跨 lane 發想 — 產出非本 lane 因子會被 Agent D (整合員) reject.

如果發現 lane 邊界模糊, 採用「主要 metric 所屬 lane」原則, 寫進 cross_lane_handoff_warnings.

## 發想原則 (R-B 系列鐵則)

### R-B1: 每因子要有可測 hypothesis (不只 method)
✗ "外資買就漲"
✓ "外資 5d 淨買 > 1000 張時, T+2-T+10 報酬高 +1~2%, 機制: 機構新一輪建倉訊號"

### R-B2: 必須註明預期 direction
- rescue (factor hit → ret 高, 進 STRONG_BUY)
- exclude (factor hit → ret 低, 進 SKIP)
- 不可寫「方向待測」

### R-B3: 機制白話一句話 (R9 鐵則)
非量化人也能秒懂:
✓ "外資加速買 = 機構新一輪建倉, 處置不影響"
✗ "foreign_5d_zscore > q70 → +1"

### R-B4: 資料源必確認 + availability tag
panel pickle / FinMind 哪個 cache / MSSQL schema. 標 ✅full / 🟡 partial / 🔴 blocked.
**MSSQL 172.16.8.90 因子必標 "Backtest only, Production needs Supabase backfill"**.

### R-B5: 預期 Δ Sh range
依 snapshot Δ + 類似因子 baseline 推估. 沒依據標 SPECULATIVE.

### R-B6: T+2 進場前可得 (R4 鐵則)
所有 fields 必 T+1 收盤前可得. T+2 後 / 未來財報 / 未來 regime = look-ahead 違規.

### R-B7: De-dup 三層檢查 (新因子提交前必跑)
1. Name fuzzy match vs phase6/7/8.2_adopted_factors.json
2. Method 字串 cross-check vs phase6/7/8.2 results 已測過
3. Predicate logic similarity (subset/window variant/redundant)

### R-B8: 因子名中文白話 (R9 鐵則)
✓ "外資近 5 日淨買速度加快"
✗ "F005_foreign_accel"
副號可在括號或 id 欄位.

### R-B9: 不發想 R8 高風險因子無止損
T-N 窗口因子在 Track B 必做 Clean/Dirty 分層. 發想時若 method 含 T-5..T-1 統計量, 必須 note 標 "需 R8 污染檢查".

### R-B10: 不發想 look-ahead 違規因子
任何用到 T+2 後 / 未來財報 / VIX 跨時區 / regime forward-looking / FinMind date 直接當 publish_date 用 (月營收必 +40d, 季報 ≥95d) 的 method 直接 reject.

### R-B11: T+0 不知處置鐵則
T+0 收盤後才公告處置, T+0 行為禁止解讀為「對處置反應/主力出貨」. 動能因子建議用 T-5~T-1 純粹事件前期, 避免 T+0 噪音.

### R-B12: 信心不代替論證 (Phase 11 BC_A/B 教訓)
baseline 對不上 → R2 鐵則停, 不能假裝跑下去. 寫 hypothesis 必註明「expected_delta 推估依據」, 沒依據 = SPECULATIVE.

## 工作流程

### Step 1 — Lane 內 panel field + cache 盤點 (10 min)
列你 lane 可用的 raw fields + 已抓 cache + 推導指標.

### Step 2 — Brainstorm round 1: 廣度 (50 ideas, 20 min)
不過濾發 50 個 raw ideas, 每個一句話 hypothesis + method.

### Step 3 — Self filter round 2: 去重 + 質量 (留 25-30, 15 min)
- vs phase6/7/8.2 採納去重
- vs results 已測去重
- 機制相似度去重 (內部 lane 內也要)

### Step 4 — Spec 完整化 (15-20 final, 30 min)
每因子寫完整 spec (見輸出 schema). novelty_score 自評 (0-1.0).

### Step 5 — Cross-agent namespace check (5 min)
看是否 lane 邊界跟其他 agent 撞名.

## 輸出格式

寫到 scripts/phase{PHASE_N}_brainstorm_lane{LANE_X}_<timestamp>.json:

```json
{
  "agent": "lane_{LANE_X}",
  "lane_name": "{LANE_NAME}",
  "submitted_at": "2026-XX-XXTHH:MM:SS",
  "n_brainstormed_round1": 50,
  "n_after_filter_round2": 28,
  "n_final": 18,
  "factors": [
    {
      "id": "L{LANE_X}_F001_<short_descriptor>",
      "name": "<完整中文白話敘述句>",
      "category": "<lane 內 sub-category>",
      "hypothesis": "<一句話機制, 含 expected effect>",
      "method": "<predicate logic>",
      "direction": "rescue" | "exclude",
      "data_source": "panel field / cache / MSSQL 172.16.8.90 / FinMind",
      "data_availability": "✅full" | "🟡 partial" | "🔴 blocked",
      "production_path": "panel-only" | "needs_supabase_backfill" | "live_finmind",
      "expected_delta_sh": [low, high],
      "snapshot_delta_evidence": "<from worst10 snapshot or null>",
      "look_ahead_audit": {
        "fields_used": ["..."],
        "all_t1_close_available": true,
        "finmind_publish_date_offset_applied": true,
        "concerns": ""
      },
      "dedup_check": {
        "vs_phase6_adopted": "<closest + jaccard>",
        "vs_phase7_adopted": "...",
        "vs_phase8_2_adopted": "...",
        "vs_tested_failed": "...",
        "novelty_score": 0.85
      },
      "r8_risk": {
        "uses_t_minus_n_window": false,
        "needs_clean_dirty_split_for_track_b": false
      },
      "panel_build_required": false,
      "priority": "高" | "中" | "低",
      "priority_reason": "<why>",
      "estimated_test_loop_time_min": 5
    }
  ],
  "lane_coverage_notes": "<this lane 涵蓋了哪些 angles, 還缺什麼>",
  "cross_lane_handoff_warnings": ["..."],
  "self_assessment": {
    "novelty_avg": 0.78,
    "depth_vs_breadth": "depth-focused / breadth-focused",
    "weakest_link_pending": ["..."]
  }
}
```

## 鐵則遵守清單 (提交前必檢)

- [ ] R1: SSOT import (不重寫 panel load)
- [ ] R2: baseline 對不上 = 停 + push back, 不假裝跑下去
- [ ] R3: Track 獨立 (在 spec 標明 5min/20min/both)
- [ ] R4: T+2 前可得 + FinMind publish_date offset
- [ ] R5: ret 用 excess_ret (回測時遵守)
- [ ] R5b: SH_SCALE = sqrt(252/9) ≈ 5.292
- [ ] R6: n<30 標警示
- [ ] R7: pkl baseline 一致
- [ ] R8: T-N 因子標 Track B 污染風險 (R-B9)
- [ ] R9: 中文名 (R-B8)
- [ ] R10: fail rate ~10:1 是常態
- [ ] R11: 多重檢定 m_eff 611, Phase {PHASE_N} 限 < 30 因子
- [ ] R12: 不直接採納, 只發想 candidate

## Stop 條件
- 時間 {TIME_BUDGET_MIN} 分鐘上限
- 提交 {N_FACTORS_TARGET} 個 final factors
- Lane 已撈底 (新 brainstorm 70% 都 dup)
- user 中斷

## 交付總結 (< 400 字)
1. 提交多少 brainstorm round 1 / final factors
2. novelty 分布 (high/mid/low vs 既有採納)
3. Top 5 預期最強 candidate (列 name + delta_sh range)
4. lane 涵蓋盲點
5. 給其他 agent 的 namespace warning
6. r8 高風險因子數量 (Track B 需 Clean/Dirty)
7. panel_build_required 因子數 (Phase 11 教訓: 需先 Panel Builder phase)

## 提示

寧可少發 5 個高質量, 不要硬塞 20 個 garbage. 品質 > 數量.

動工! 先 Step 0 載入 skill 跟讀清單, 再 brainstorm.
```

---

## 改編 tips

### 派發 8 個 agent 範例
```
單一 message 內呼叫 8 個 Agent tool calls:
Agent 1-8 分別套 lane 1-8, prompt body 取上方 block, 套用變數.
```

### 整合到 Agent D (整合員) 的接口
brainstorm 完成後 Agent D 應:
1. 讀全部 phase{N}_brainstorm_lane*_*.json
2. Cross-lane Jaccard 跑一次
3. 排序: novelty + priority + data_availability → 「優先測試清單」
4. 接著用 **02_因子回測-Entry入場因子Prompt.md** 派回測 agents (一般因子)
5. 或用 **03_因子回測-Exit提前出場因子Prompt.md** 派出場因子 agents

### 常見錯誤
❌ 8 agent 都跑 lane 1 → 嚴格 lane 分配
❌ 不讀已採納清單就 brainstorm → Step 0.3/0.4 必讀
❌ brainstorm 50 個全當 final → round 1 廣度 50, round 2 篩 25-30, round 3 spec 化 15-20
❌ 跨 lane 發想造成衝突 → 嚴格 lane 邊界 + cross_lane_handoff_warnings
❌ 不限 < 30 因子 → m_eff blow up, Bonferroni 過嚴所有因子失效
