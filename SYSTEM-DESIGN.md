# Trading System Design — Learning-Based Chart Analyzer

## Vision

A system that learns to evaluate stock charts the way a human trader does — by seeing examples, building experience, and eventually extracting objective patterns from the data.

**The approach is inductive:**
```
Observe (cases) → Learn (patterns) → Extract (rules from data) → Apply (screener) → Trade
```

NOT deductive (theory → hardcode rules → filter). The strategy is still being learned. The system learns WITH you.

## Core Principles

### 1. Visual First, Data Makes It Objective
The strategy is visual — "smooth base", "clean rounding", "volume drying up." These are pattern recognition, not formulas. But data (price, volume, SMAs) provides EVIDENCE that makes the visual judgment measurable and reproducible.

### 2. Learn Before You Extract
Don't pre-define rules. Feed examples. Let the system observe what good and bad cases have in common. Only after seeing enough evidence → extract quantifiable patterns.

### 3. Image + Data Together
- Image alone: subjective, can't scale, can't screen
- Data alone: misses visual quality ("smooth" can't be a number)
- Together: data validates what the eye sees, makes it objective, enables extraction

### 4. Patterns Are Earned, Not Assumed
The reference docs (stage analysis, CDS methodology) are vocabulary and orientation. The REAL patterns emerge from YOUR labeled cases + their data. You might discover things the course doesn't explicitly teach.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CASE STORE                               │
│  (Images + Data + Labels + Outcomes + Notes)                     │
└───────────────────────────────┬─────────────────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              │                 │                 │
              ▼                 ▼                 ▼
    ┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │   TEACHING   │  │ PATTERN EXTRACT  │  │    EVALUATOR     │
    │  (Phase 1)   │  │    (Phase 2)     │  │    (Phase 4)     │
    │              │  │                  │  │  Vision + Data   │
    │ Feed cases,  │  │ Discover what    │  │  + Cases → Deep  │
    │ observe data │  │ data patterns    │  │  analysis        │
    └──────────────┘  │ predict success  │  └──────────────────┘
              │       └────────┬─────────┘           ▲
              │                │                     │
              ▼                ▼                     │
    ┌──────────────┐  ┌──────────────────┐          │
    │   FEEDBACK   │  │    SCREENER      │──────────┘
    │    LOOP      │  │    (Phase 3)     │
    │              │  │                  │
    │ Track what   │  │ Apply extracted  │
    │ worked/failed│  │ patterns to 500  │
    └──────────────┘  │ stocks → 15-30   │
                      └──────────────────┘
```

## The Five Phases

### Phase 1: TEACH + OBSERVE
**Goal:** Build a case library. System sees charts + data. Stores everything.

- User feeds examples: "this worked", "this failed", "this is why"
- System stores image + fetches data (price, volume, SMAs, everything)
- System notes observations: "volume was 60% below average", "depth was 14%"
- No filtering, no judgment yet — just accumulating evidence
- Target: 50-200 labeled cases

**What the system stores per case:**
- Chart image (exactly as seen in TradingView)
- Full data snapshot (OHLCV, all SMAs, volume metrics, computed values)
- User's label and reasoning
- Outcome (filled later)

### Phase 2: EXTRACT PATTERNS
**Goal:** Discover what data patterns separate winners from losers.

Once enough cases exist, the system analyzes:
```
"Across 80 good bases that WORKED:
  - Volume contraction: median 55%, range 40-70%
  - Base depth: median 14%, range 10-20%
  - Candle count: median 32, range 25-45
  - 200 DMA slope: median +0.3%/week, minimum +0.15%
  - Price vs 200 DMA: median +18%, range +10-30%
  - [Custom pattern X that emerged from YOUR data]

 Across 40 bases that FAILED:
  - Volume contraction: only 20% (not enough)
  - Base depth: 25%+ (too deep)
  - Structure: choppy (data correlate TBD)
  - Slope: flatter or declining"
```

User validates and refines: "Yes that matches my intuition" / "Adjust this threshold"

**This is the strategy being BORN from data.** Not copied from a book — earned from evidence.

### Phase 3: SCREENER
**Goal:** Apply extracted patterns to the full stock universe daily.

- The validated patterns become quantifiable filters
- Run against Nifty 500 (or broader) daily
- Output: 15-30 stocks that match the learned pattern
- This is NOT the final answer — it's the FUNNEL

```
Nifty 500 → [Extracted pattern filters] → 15-30 candidates
```

The screener is built FROM Phase 2 results. It evolves as more cases are added and patterns are refined.

### Phase 4: EVALUATE (Deep Visual + Data Analysis)
**Goal:** Full analysis of screener candidates using vision + case library.

For each of the 15-30 candidates:
- Pull chart image + current data
- Retrieve similar past cases from the library
- Vision model evaluates: quality, readiness, confidence
- References specific past cases as evidence

```
15-30 candidates → [Visual + Data + Case comparison] → 3-5 actionable setups
```

### Phase 5: TRADE
**Goal:** Specific trade parameters for actionable setups.

For each actionable setup:
- Entry price (trigger level)
- Stop loss (from data: TRP%, structure-based)
- Position size (from risk management rules)
- R-multiple target
- Similar past cases: what happened, how long did it take

```
3-5 setups → [Trade parameters] → Execute
```

## Ultra Vision (End State)

```
Daily automated pipeline:

06:00  Data refresh (OHLCV for universe)
06:05  Screener runs (extracted patterns → 15-30 stocks)
06:10  Evaluator runs (deep analysis on 15-30 → 3-5 setups)
06:15  Output: "Today's setups" with entry/SL/target/confidence/evidence

You review → decide → execute (or let it execute)
```

---

## Components

### 1. Case Store (SQLite + Filesystem)

**Schema:**
```sql
CREATE TABLE cases (
  id INTEGER PRIMARY KEY,
  symbol TEXT NOT NULL,
  date TEXT NOT NULL,
  timeframe TEXT NOT NULL,

  -- Classification (user-provided)
  label TEXT NOT NULL,
  sub_label TEXT,
  confidence TEXT,
  notes TEXT,

  -- Raw data snapshot (for learning — store EVERYTHING)
  price_close REAL,
  price_high_52w REAL,
  sma_10 REAL,
  sma_20 REAL,
  sma_50 REAL,
  sma_200 REAL,
  sma_200_slope REAL,
  sma_50_slope REAL,
  price_vs_200_pct REAL,
  price_vs_50_pct REAL,
  volume_current REAL,
  volume_avg_20 REAL,
  volume_avg_50 REAL,
  volume_contraction_pct REAL,
  base_depth_pct REAL,
  base_candles INTEGER,
  trp_pct REAL,
  adt_cr REAL,
  relative_volume REAL,

  -- Context
  nifty500_stage INTEGER,
  sector TEXT,

  -- Outcome (filled later)
  outcome TEXT,
  outcome_pct REAL,
  outcome_duration_days INTEGER,
  outcome_notes TEXT,

  -- Files
  image_path TEXT NOT NULL,
  data_json TEXT,              -- full raw data as JSON (captures everything, even fields not in columns)

  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX idx_cases_label ON cases(label);
CREATE INDEX idx_cases_outcome ON cases(outcome);
CREATE INDEX idx_cases_symbol ON cases(symbol);
```

**Key principle:** Store MORE data than you think you need. You don't know which fields will matter until Phase 2 reveals it. The `data_json` column captures everything raw.

**Filesystem:**
```
charts/
  cases/
    001-CDSL-2024-03-15-weekly/
      chart.png
      data.json
    002-TATAELXSI-2024-01-20-weekly/
      chart.png
      data.json
```

### 2. TradingView MCP Tool

**Purpose:** Fetch data + capture chart screenshots. Serves both teaching and autonomous phases.

**Tools:**

```
tv_get_data(symbol, timeframe?)
  → Fetches from TradingView Scanner API + Yahoo Finance
  → Returns ALL available data (not pre-filtered):
    {
      symbol, date, timeframe,
      price: { open, high, low, close, high_52w, low_52w },
      moving_averages: { sma10, sma20, sma50, sma200 },
      slopes: { sma200_slope, sma50_slope, sma20_slope },
      volume: { current, avg_20d, avg_50d, contraction_pct, relative },
      position: { vs_200dma_pct, vs_50dma_pct, vs_52w_high_pct },
      computed: { trp_pct, adt_cr, base_depth_est, base_candles_est }
    }

tv_screenshot(symbol, timeframe?)
  → Chrome DevTools → TradingView → apply template → screenshot
  → Returns image path

tv_evaluate(symbol, timeframe?)
  → Full pipeline: data + screenshot + retrieve similar cases + vision analysis
  → Returns structured assessment
```

**Data sources:**
| Source | Provides | Use |
|--------|----------|-----|
| TradingView Scanner API | Current indicators (pre-computed by TV) | Fast current-state data |
| Yahoo Finance (.NS) | Full historical OHLCV | Computing slopes, candle counts, historical patterns |
| Chrome DevTools + TradingView | Chart screenshots | Visual evaluation |

### 3. Teaching Interface

**Must be FAST — under 60 seconds per case.**

```
User: *paste chart* "CDSL weekly. Good base. Worked. Ran 60%."

System:
  1. Stores image
  2. Fetches ALL available data for CDSL at that date
  3. Stores case with label + data
  4. Confirms: "Case #47 stored. Data captured:
     price ₹1,450, 22% > 200 DMA, slope +0.4%/week,
     volume -58% vs 20w avg, base 30 candles, depth 14%.
     Outcome: worked, +60%."
```

**Labels:**
| Label | Meaning |
|-------|---------|
| `good_base` | Clean base, led to breakout |
| `bad_base` | Choppy, broke down, or didn't follow through |
| `good_entry` | Entry taken, trade worked |
| `failed_entry` | Entry taken, stopped out |
| `breakout_real` | Valid breakout with follow-through |
| `breakout_fake` | Breakout that reversed |
| `avoid` | Tempting but wrong |
| `borderline` | 60/40 call |
| `distribution` | Looks like base but is Stage 3 |
| `stage_4_trap` | Looks like recovery but isn't |

### 4. Pattern Extraction Engine (Phase 2)

**What it does:** Analyzes the case library to find data patterns that separate outcomes.

```
Input: All cases with outcomes

Process:
  - Group by outcome (worked vs failed)
  - For each data field: compute distribution per group
  - Find fields with significant separation between groups
  - Propose thresholds and combinations

Output:
  "Pattern discovered:
   GOOD bases tend to have:
     volume_contraction_pct > 40%  (present in 85% of winners, 30% of losers)
     base_depth_pct: 10-20%       (present in 78% of winners, 25% of losers)
     sma_200_slope > 0.15%        (present in 90% of winners, 45% of losers)
     base_candles: 25-45          (present in 72% of winners, 40% of losers)
   
   Combined filter hits 70% of winners and only 15% of losers."
```

**This could be:**
- Statistical analysis (simple distribution comparison)
- Decision tree / random forest (if enough cases)
- LLM analysis (given all cases as context, "what patterns do you see?")
- Or manual: user reviews data of winners vs losers and spots patterns themselves

The system PROPOSES patterns. The user VALIDATES them. Only validated patterns go into the screener.

### 5. Screener (Phase 3)

**Built from extracted, validated patterns.**

```
screener_config.json:
{
  "filters": [
    { "field": "price_vs_200_pct", "min": 5, "max": 40 },
    { "field": "sma_200_slope", "min": 0.15 },
    { "field": "volume_contraction_pct", "min": 35 },
    { "field": "base_depth_pct", "min": 8, "max": 22 },
    { "field": "base_candles", "min": 20 },
    { "field": "trp_pct", "min": 2 },
    { "field": "adt_cr", "min": 7 }
  ],
  "version": "v1.0",
  "based_on_cases": 150,
  "accuracy_on_test_set": "72%",
  "last_updated": "2025-06-15"
}
```

- Runs daily against full universe (Nifty 500 or broader)
- Outputs: 15-30 candidates matching the pattern
- Screener config EVOLVES as more cases are added and patterns refined
- Versioned — can compare v1.0 vs v2.0 accuracy

### 6. Evaluator (Phase 4)

**Deep analysis on screener candidates using vision + case library.**

```
For each candidate from screener:
  1. Fetch current chart image
  2. Fetch full current data
  3. Retrieve 5-10 most similar past cases (by data similarity)
  4. Send to vision model:
     - Chart image
     - Structured data
     - Similar cases (their images + data + outcomes)
     - Strategy vocabulary (from reference docs)
  5. Output: full assessment with confidence + evidence
```

**Output format:**
```
## SYMBOL — Assessment

**Setup Quality:** 8/10
**Confidence:** 75%
**Action:** Entry candidate

**Data Evidence:**
- Volume contraction: 62% (strong, typical of winners)
- Base depth: 15% (sweet spot per extracted pattern)
- Candle count: 33 (sufficient)
- 200 DMA slope: +0.35%/week (healthy)

**Visual Evidence:**
- Clean rounding at base bottom
- No choppy wicks
- Volume bars clearly shrinking

**Similar Cases:**
- Case #12 (CDSL): 90% similar → ran 60% ✓
- Case #34 (HDFCBANK): 82% similar → ran 25% ✓
- Case #19 (INFY): 75% similar → FAILED (but was choppier)

**Trade Setup:**
- Entry: ₹1,465 (trigger break)
- Stop Loss: ₹1,410 (TRP-based, -3.8%)
- Position: per risk rules
- Target: 2R minimum (₹1,575)
```

### 7. Feedback Loop

**Outcome tracking (semi-automated):**
- System knows entry date + symbol from case
- Checks price periodically: "Case #47 entered 30 days ago, currently +18%"
- Prompts user to confirm status
- Feeds outcomes back into pattern extraction

**Pattern validation:**
- As new outcomes arrive, re-run pattern extraction
- "Pattern v1.0 predicted this would work. It did/didn't. Adjusting thresholds."
- Screener config auto-updates (with user approval)

**Accuracy tracking:**
- Hit rate of screener (% of filtered stocks that become real setups)
- Hit rate of evaluator (% of recommended trades that work)
- Track over time — is the system improving?

---

## Known Gaps & Mitigations

### Critical

| Gap | Risk | Mitigation |
|-----|------|-----------|
| Need enough cases before extraction works | Pattern extraction with 20 cases is unreliable | Phase 2 starts at 50+ cases minimum. System warns if sample too small. |
| Historical chart generation for past dates | Can't compute "what this looked like on Nov 2023" easily | Phase 1-2 uses live charts. Historical mode built in Phase 3 using historical OHLCV + charting library. |
| Retrieval quality (finding similar cases) | Wrong cases → bad reasoning | Start with data-similarity (euclidean distance on normalized metrics). Add visual similarity later. |
| Outcome tracking requires discipline | Without outcomes, can't learn what works | Semi-automate: system checks prices weekly, asks user to confirm. |

### Important

| Gap | Risk | Mitigation |
|-----|------|-----------|
| Not enough negative examples | System only learns what "good" looks like | Force balance: system prompts "Save failures too." Target 40% negative cases. |
| Borderline cases missing | System can't handle 60/40 calls | Explicit "borderline" label with explanation. These are the most valuable training data. |
| Market regime changes | Bull patterns fail in bears | Tag cases with Nifty 500 stage. Screener can have regime-specific variants. |
| Overfitting patterns to small sample | Extracted rules work on training data but not new data | Hold out 20% of cases for testing. Report accuracy on held-out set. |
| Visual consistency | Different chart styles confuse evaluation | Standardize: always same TradingView template (dark, Holo, MA ribbon). |

### Discipline (Biggest Risk)

| Need | Design Fix |
|------|-----------|
| Save failures too | System tracks ratio, prompts for balance |
| Log outcomes later | System sends weekly reminders with current P&L |
| Keep feeding cases daily | Track cases/week metric, gamify |
| Explain reasoning | System asks ONE question: "Why?" — keeps it fast |
| Validate extracted patterns | System presents patterns for approval, never auto-applies |

---

## Testability — Each Phase Independent

### Phase 1: Teaching (Test independently)
```
✓ Can store a case in under 60 seconds? (paste + one sentence)
✓ Does data fetch return accurate values? (verify vs TradingView)
✓ Can retrieve cases by label/outcome?
✓ Is the case library growing? (metric: cases/week)
✓ Balance check: ratio of positive/negative cases?
```

### Phase 2: Pattern Extraction (Test independently)
```
✓ Given 50+ cases, does it find meaningful data separations?
✓ Do proposed patterns match your intuition?
✓ Hold-out test: patterns predict held-out case outcomes?
✓ Are the thresholds stable (don't flip with 5 more cases)?
✓ Can you explain WHY each pattern makes sense?
```

### Phase 3: Screener (Test independently)
```
✓ Does screener filter Nifty 500 → reasonable number (15-40)?
✓ Manual check: are the filtered stocks actually interesting?
✓ Bactest: run screener on historical data, check hit rate
✓ Compare: screener output vs your manual watchlist — overlap?
✓ False positive rate: of screener results, how many are clearly bad?
```

### Phase 4: Evaluator (Test independently)
```
✓ Given a chart + data + cases, does it produce coherent analysis?
✓ Does it reference relevant past cases?
✓ Is confidence calibrated? (high confidence = usually right)
✓ Blind test: show 10 charts, compare its rating to yours
✓ Does it flag uncertainty on borderline cases?
```

### Phase 5: Full Pipeline (Integration test)
```
✓ End-to-end: symbol → data → screen → evaluate → trade params
✓ Does the output match what you'd do manually?
✓ Backtest on known historical setups with known outcomes
✓ Track live: recommendations vs actual outcomes over 3 months
```

### Component-Level Tests
```
Data Fetcher:
  - tv_get_data("RELIANCE") matches TradingView? ✓/✗
  - Historical OHLCV matches Yahoo Finance? ✓/✗

Case Store:
  - CRUD operations work? ✓/✗
  - Query by label, stage, outcome? ✓/✗
  - Data integrity (no nulls in required fields)? ✓/✗

Pattern Extraction:
  - With synthetic data (known patterns), does it find them? ✓/✗
  - Stable with noise? ✓/✗

Screener:
  - Correct number of results? ✓/✗
  - All results actually pass all filters? ✓/✗
  - Performance: runs in <30 seconds for 500 stocks? ✓/✗
```

---

## Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Runtime | Bun | Project standard |
| Database | bun:sqlite | Simple, local, fast |
| Data API | TradingView Scanner API + Yahoo Finance | Free, no auth for scanner; Yahoo for history |
| Screenshots | Chrome DevTools MCP (existing) | Already available, opens real TradingView |
| Vision Model | Claude (via LiteLLM proxy) | Best vision + reasoning, already in use |
| MCP Framework | Custom Bun-based MCP server | Integrates with OpenCode workflow |
| Pattern Analysis | Statistical (built-in) + LLM-assisted | Simple stats first, LLM for discovery |

---

## File Structure

```
nse-trading-system/
  src/
    data/
      fetch-yahoo.ts         — Historical OHLCV
      fetch-tv-scanner.ts    — Current indicators from TradingView
      universe.ts            — Nifty 500 symbol list
    store/
      schema.ts              — SQLite schema + migrations
      cases.ts               — Case CRUD
      query.ts               — Retrieval / similarity search
    extraction/
      analyze.ts             — Statistical analysis of cases by outcome
      propose-patterns.ts    — Generate pattern proposals
      validate.ts            — Test patterns against held-out cases
    screener/
      config.ts              — Load/save screener config
      run.ts                 — Apply filters to universe
      backtest.ts            — Run screener on historical data
    evaluator/
      prompt.ts              — Build evaluation prompt
      evaluate.ts            — Call vision model
      format.ts              — Format output
    mcp/
      server.ts              — MCP server
      tools/
        get-data.ts          — tv_get_data
        screenshot.ts        — tv_screenshot
        teach.ts             — store_case
        evaluate.ts          — tv_evaluate
        extract-patterns.ts  — run extraction
        screen.ts            — run screener
  charts/
    cases/                   — Stored case images + data
  screener/
    configs/                 — Versioned screener configs (v1.0.json, v2.0.json)
    results/                 — Daily screener output
  rules/                     — Strategy reference docs (for prompt context)
  scripts/
    distill.ts              — (existing) transcript distillation
    teach.ts                — CLI for quick case entry
    review.ts               — Outcome review reminders
    accuracy.ts             — Accuracy report
    extract.ts              — Run pattern extraction
  tests/
    data.test.ts
    store.test.ts
    extraction.test.ts
    screener.test.ts
    evaluator.test.ts
```

---

## Build Order

| Step | What | Testable Alone? | Depends On |
|------|------|----------------|------------|
| 1 | Case store (SQLite schema + CRUD) | ✓ | Nothing |
| 2 | Data fetcher (Yahoo + TV Scanner) | ✓ | Nothing |
| 3 | Teaching interface (paste + label → stored case with data) | ✓ | Steps 1, 2 |
| 4 | Feedback loop (outcome tracking + reminders) | ✓ | Step 1 |
| 5 | Pattern extraction (analyze cases, propose patterns) | ✓ | Step 1 (needs 50+ cases) |
| 6 | Screener (apply extracted patterns to universe) | ✓ | Steps 2, 5 |
| 7 | Evaluator (vision + data + cases → deep analysis) | ✓ | Steps 1, 2, 3 |
| 8 | TradingView MCP (wraps everything into tools) | ✓ | Steps 2, 3, 7 |
| 9 | Autonomous pipeline (daily: screen → evaluate → output) | ✓ | Steps 6, 7, 8 |

**Each step is independently testable and useful on its own.**

---

## Usage Examples

### Phase 1 — Teaching
```
User: *paste chart* "CDSL weekly. Good base. Ran 60% in 3 months."

System: "Case #47 stored.
  Data: ₹1,450 | +22% vs 200 DMA | slope +0.4%/wk | vol -58% | 30 candles | 14% deep
  Label: good_base | Outcome: worked +60%
  Library: 47 cases (28 good, 15 bad, 4 borderline)"
```

### Phase 2 — Pattern Extraction
```
System: "Analyzed 85 cases (52 worked, 33 failed).

  Strongest data separators:
  1. volume_contraction > 40%    (hit: 85% winners, 28% losers)
  2. base_depth 10-20%           (hit: 78% winners, 24% losers)  
  3. sma_200_slope > 0.15%/wk    (hit: 91% winners, 45% losers)
  4. base_candles 25-45          (hit: 73% winners, 39% losers)
  5. relative_volume < 0.6       (hit: 68% winners, 31% losers)

  Combined (all 5): hits 62% of winners, 8% of losers.
  Combined (any 4 of 5): hits 81% of winners, 18% of losers.

  Propose screener: require 4 of 5 conditions.
  Validate on held-out set (17 cases): 76% accuracy.

  Accept this pattern? [yes / adjust / need more cases]"
```

### Phase 3 — Screener Output
```
Daily Screener (v1.2) — 2025-04-30
Filtered: 22 of 487 stocks pass

Top candidates (sorted by pattern match strength):
  CDSL        — 5/5 conditions met | vol -65% | 28 candles | depth 13%
  TATAELXSI   — 5/5 conditions met | vol -58% | 35 candles | depth 16%
  HDFCBANK    — 4/5 conditions met | vol -42% | 22 candles | depth 11%
  ...

→ Run evaluator on top 10? [yes/no]
```

### Phase 4 — Deep Evaluation
```
## CDSL — Weekly Assessment

**Setup Quality:** 8.5/10
**Confidence:** 78%
**Action:** Entry candidate

**Data Evidence:**
- Volume contraction: 65% ← strong (pattern threshold: 40%)
- Base depth: 13% ← sweet spot (pattern range: 10-20%)
- Candle count: 28 ← sufficient (pattern range: 25-45)
- 200 DMA slope: +0.38%/wk ← healthy (pattern min: 0.15%)
- TRP: 3.1% ← good volatility

**Visual Evidence:**
- Clean rounding at bottom ✓
- No choppy wicks ✓
- Volume bars clearly shrinking ✓
- PPC visible at turnaround ✓

**Similar Cases:**
- Case #12 (CDSL prev): 92% similar → ran 60% ✓
- Case #34 (HDFCBANK): 84% similar → ran 25% ✓
- Case #51 (BAJFINANCE): 79% similar → ran 35% ✓
- No similar failures found in library

**Trade Setup:**
- Entry: ₹1,465 (break of trigger bar high)
- Stop Loss: ₹1,410 (-3.8%, TRP-based)
- R1 Target: ₹1,575 (2R)
- R2 Target: ₹1,685 (5R, based on similar case outcomes)
```

### Phase 5 — Outcome Review
```
System: "Weekly review — 4 cases need updates:

  Case #47 (CDSL, 30 days): +22% | Status?
  Case #51 (BAJFIN, 21 days): +8% | Status?
  Case #53 (RELIANCE, 14 days): -1% | Status?
  Case #55 (INFY, 7 days): +3% | Status?

  Also: 2 screener picks from last week weren't entered.
  Want to label them as 'passed' or 'avoid' for the library?"
```

---

## Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 | Phase 5 (live) |
|--------|---------|---------|---------|----------------|
| Cases in library | 50+ | 100+ | 200+ | 300+ |
| Negative examples | 30%+ | 40%+ | 40%+ | 40%+ |
| Pattern extraction accuracy (held-out) | N/A | 70%+ | 75%+ | 80%+ |
| Screener precision (filtered → actually good) | N/A | N/A | 50%+ | 65%+ |
| Evaluator agreement with user | N/A | 75%+ | 80%+ | 85%+ |
| Time per teaching interaction | <90s | <60s | <30s | <30s |
| Outcome coverage (cases with known outcome) | 50% | 70% | 85% | 90%+ |

---

## Key Insight: Why This Works

The system mirrors how a human trader develops expertise:

1. **Beginner:** Learns vocabulary and theory (reference docs)
2. **Student:** Studies examples, starts seeing patterns (Phase 1)
3. **Practitioner:** Can articulate what makes a good setup (Phase 2 — extraction)
4. **Expert:** Scans efficiently, focuses on the best opportunities (Phase 3 — screener)
5. **Master:** Quick, confident evaluation with nuanced judgment (Phase 4 — evaluator)

The automation follows the same learning curve. It doesn't skip steps. It earns each level through evidence.

---

*Document version: 2.0 — Corrected to inductive learning approach.*
*Previous version assumed deductive (rules → apply). This version: observe → extract → apply.*
*Last updated: 2025-04-30*
