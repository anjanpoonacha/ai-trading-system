# CVD Analysis Session Handoff

> For resuming on another machine with herdr + opencode + TradingView MCP.
> Date: 2026-08-15. Written by Claude (Sonnet 4.6).

---

## What We Built

A CVD-based analysis framework for NSE stocks. The core question for every stock:

1. **Was there a CVD tell before any prior significant move?** Find it in historical data — what it showed, when, how many days before.
2. **Is that same pattern present now?** Match / partial / no — specific about what differs.
3. **No tell is itself a tell.** Don't force CVD to say something it isn't saying.

All findings are in `docs/cvd-observations.md`. The methodology is in `tradingview-mcp/docs/analysis-framework.md`.

---

## Infrastructure

**Opencode panes (herdr):**
- `wM:pF` — primary opencode session with TradingView MCP. Use this to fetch data.
- `wM:pD` — secondary opencode, use for batch fetches.

**To fetch a stock:**
```
herdr agent prompt wM:pF "Fetch <STOCK> CVD. Write to /tmp/<stock>-cvd.json.
Run:
1. { symbol: 'NSE:<STOCK>', timeframe: '1D', count: 800, output: ['data'], cvdAnchor: '3M' }
2. { symbol: 'NSE:<STOCK>', timeframe: '1D', count: 800, output: ['data'], cvdAnchor: '6M' }
3. { symbol: 'NSE:<STOCK>', timeframe: '1D', count: 120, output: ['data'], cvdAnchor: '3M' }
4. { symbol: 'NSE:<STOCK>', timeframe: '1W', count: 200, output: ['data'], cvdAnchor: '3M' }
Keys: hist_3m, hist_6m, cur_3m, weekly_3m. Output DONE."
```

**To analyse after fetch:**
```bun
const raw = JSON.parse(await Bun.file('/tmp/<stock>-cvd.json').text());
const d = raw.hist_3m?.data ?? raw.hist_3m;
const bars = d?.bars ?? [], cvd = d?.cvd ?? [], cvdA = cvd.slice(-bars.length);
// CVD is OHLC: c=close, h=high, l=low
// tail = c - l (intrabar buyer recovery)
// wick = h - c (intrabar seller absorption)
// tail >> wick = buyers won. wick >> tail = sellers won.
```

---

## The Mental Model

### CVD Anchor
CVD resets to zero at the start of each anchor period. Values **only** comparable within the same window. After a reset, CVD starts near zero regardless of prior values.

- **3M anchor** — best for early tells. Shorter window = signal appears sooner.
- **6M anchor** — structural confirmation. Still negative when 3M is already positive = early divergence signal.
- **12M anchor** — resets Jan 1 (calendar, not rolling). Dec and Jan values incomparable.
- Rule: run 3M and 6M together. Divergence between them is itself a signal.

### CVD OHLC — Always Read Wicks
CVD has open/high/low/close. Never read just the close.

- `tail = close − low` → how much sellers pushed intrabar, buyers recovered
- `wick = high − close` → how much buyers pushed intrabar, sellers faded
- **tail >> wick** = buyers in control all session = conviction
- **wick >> tail** = sellers absorbed demand = distribution / failure
- Zero wick = buyers had the entire session, no pushback at all

### The Two Regimes
Same absorption candle (tail >> wick, high volume) means different things depending on context:

| Context | Meaning | Hit rate (observed) |
|---|---|---|
| Price falling/flat + CVD low in window | Accumulation — informed buyers loading | ~24% RUN in 20d, ~22% FAIL |
| Price rising + CVD high in window | Momentum continuation — buyers defending in pullback | ~49% RUN in 20d, ~28% FAIL |
| Price at highs + CVD at peak + wick >> tail | Distribution — sellers absorbing demand | Bearish |

### No Tell Is A Tell
When CVD shows nothing before a move:
- Move is event/catalyst/momentum driven
- No informed pre-positioning
- More likely to be short-lived or reverse
- **Don't force a read. Absence of pattern is information.**

### False Positive Filter
Absorption tell (tail >> wick, high volume) fails when it appears at CVD peaks with price at highs. The same candle = distribution, not accumulation. Two filters that remove most false positives:
1. CVD must be in lower half of anchor window range (not at peak)
2. Price should be in base or decline (not at all-time highs)

Exception: momentum continuation stocks (LLOYDSENGG, NETWEB, FCL) — absorption during pullbacks within a run is valid even with high CVD.

---

## Pre-Run Signatures (What to Look For)

**Strongest tells observed:**
1. **Zero-wick BUY sessions** on any volume — no seller resistance at all. Often quiet (low volume). Look for clusters of 2–3 consecutive zero-wick sessions.
2. **Battle-pair recovery** — high-volume SELL day (wick >> tail) followed next day by BUY (tail >> wick). Sellers tried, buyers took it back.
3. **Absorption on down price days** — price falls, CVD barely moves or improves. Strongest divergence signal.
4. **3M/6M divergence** — 3M positive while 6M still negative = accumulation in new window before long-term sellers give up.
5. **Zero wick on anchor reset day** — buyers immediately in control of the new window.

**Lead time observed:** 3–42 days before run start. Median ~14–21 days.

---

## Stocks Analysed — Current Status (Aug 15 2026)

### Active Tells / Bullish Structure
| Stock | Tell type | Key session | CVD now | Status |
|---|---|---|---|---|
| **LLOYDSENGG** | Momentum continuation | Aug 7: tail:18.22M, zero wick, 64M vol | +23.45M | Strong — zero-wick history session, 3M rising |
| **FCL** | Base reversal matching May 2026 | Aug 11: CVD crossed positive | +4.80M | Matches pre-May 2026 explosion structure |
| **NETWEB** | Absorption tell | Aug 13: tail:wick = 28:1 | +1.042M | Feb 12 2026 pattern repeating; Aug 14 seller pushback |
| **ABB** | Zero-wick accumulation cluster | Jul 15, Aug 3: zero wicks | +1.025M | Matches Feb 2026 pre-run structure |
| **360ONE** | Zero wicks on DOWN days | Jul 8 (-4.5%), Jul 13, Jul 16: all zero wick | +2.829M | Strongest current setup — 3 zero wicks on down days |
| **ACE** | Battle-pair + zero wick recovery | Jul 21 SELL (5.92M) / Jul 24 BUY; Jul 30 zero wick | +1.091M | Matches prior run pattern |
| **ANANTRAJ** | Zero-wick build matching Apr 2026 | Jul 27, Aug 11: zero wicks | +5.621M | Pattern repeating; CVD at +5.6M |
| **GRAPHITE** | Battle-pair + absorption | Jul 23/24 battle-pair; Aug 4: tail:wick 19:1 | +6.375M | Sep 2024 pattern repeating at same CVD level |
| **DREDGECORP** | Event-driven absorption | Aug 14: 1.44M vol, tail:0.278M | +0.295M | Weak but present; similar to pre-Oct 2025 spike |
| **63MOONS** | Post-explosion consolidation | Jul 31: 14M vol, tail:4.738M zero-wick | +5.496M | Holding post-explosion; next leg possible |

### No Tell / Ambiguous / Caution
| Stock | Status | Why |
|---|---|---|
| **SBIN** | Distribution signal | CVD negative (-5.3M), wick-dominant sessions at highs |
| **SONATSOFTW** | No tell — distribution | Jul 2, Jul 13: wick >> tail on highest-volume sessions |
| **MARUTI** | Partial | Jul 8 absorbed but no confirmation leg yet |
| **GRASIM** | No tell | CVD near zero, Aug 10/12 wick-dominant at all-time highs |
| **3MINDIA** | Broken | Aug 14: 20,827 shares, wick:11.8K = 58:1 sellers; CVD crashed |
| **GALAXYSURF** | Breakout confirmed, extended | Aug 14 was +40% run's confirmation day, not a tell |
| **MARUTI** | Partial only | Jul 8 structure not confirmed by subsequent divergence |

---

## How to Resume a Stock Analysis

```bash
# 1. Fetch (if data is stale — files in /tmp/ may be from yesterday)
herdr agent prompt wM:pF "Fetch NSE:<STOCK> current state. Write to /tmp/<stock>-cvd.json.
{ symbol: 'NSE:<STOCK>', timeframe: '1D', count: 120, output: ['data'], cvdAnchor: '3M' }
Key: cur_3m. Output DONE."

# 2. Wait
herdr agent wait wM:pF --timeout 120000

# 3. Analyse with bun — extract last 20 bars with tail/wick
bun -e "
const raw = JSON.parse(await Bun.file('/tmp/<stock>-cvd.json').text());
const d = raw.cur_3m?.data ?? raw.cur_3m;
const bars = d?.bars ?? [], cvd = d?.cvd ?? [], cvdA = cvd.slice(-bars.length);
const start = Math.max(0, bars.length - 20);
for (let i = start; i < bars.length; i++) {
  const b=bars[i], c=cvdA[i];
  const date=new Date(b.t*1000).toISOString().slice(0,10);
  const chg=((b.c-b.o)/b.o*100).toFixed(1);
  const tail=((c?.c-c?.l)/1e6).toFixed(3);
  const wick=((c?.h-c?.c)/1e6).toFixed(3);
  const dom=parseFloat(tail)>parseFloat(wick)*1.5?'BUY':parseFloat(wick)>parseFloat(tail)*1.5?'SELL':'~';
  const prev=cvdA[i-1]?.c;
  const reset=prev!=null&&Math.abs(c?.c)<Math.abs(prev)*0.15&&Math.abs(c?.c)<3e6?' R':'';
  console.log(date,'C:'+b.c.toFixed(1),'chg:'+chg+'%','vol:'+(b.v/1e6).toFixed(2)+'M',
    'CVD:'+(c?.c/1e6).toFixed(3)+'M','tail:'+tail+'M','wick:'+wick+'M',dom+reset);
}" 2>&1
```

---

## The Starting Prompt for a New Session

Use this to brief a fresh Claude on the context:

---

> We are doing CVD-based analysis of NSE stocks to identify pre-bull-run accumulation patterns.
>
> **Core framework (read `docs/cvd-observations.md` and `tradingview-mcp/docs/analysis-framework.md`):**
>
> - CVD resets at each anchor period boundary. Values only comparable within the same window.
> - Always read CVD as OHLC: tail = close−low (buyer recovery), wick = high−close (seller absorption).
> - tail >> wick = buyers won intrabar. wick >> tail = sellers won.
> - Zero wick = no seller resistance at all. Look for clusters.
> - Run 3M and 6M anchors together. Divergence between them is an early signal.
> - Two regimes: base reversal (price down, CVD improving) and momentum continuation (pullback during run).
> - **No tell is a tell.** Don't force CVD to say something it isn't saying.
>
> **Infrastructure:**
> - Fetch data via herdr: `herdr agent prompt wM:pF "..."` then `herdr agent wait wM:pF --timeout 120000`
> - Parse with bun. CVD OHLC fields: c (close), h (high), l (low), o (open). Divide by 1e6 for M values.
> - All prior analysis in `/tmp/<stock>-cvd.json` (may be stale — refetch if > 1 day old).
>
> **For each stock:**
> 1. Find all bull runs >15% in the historical data (don't assume dates — compute from data)
> 2. For each run: what did CVD show before it? Identify the tell or confirm no tell.
> 3. What is the current CVD state in the latest anchor window?
> 4. Match / partial / no match to historical tells.
> 5. State the watch level (confirm) and invalidation level.
>
> **Stocks with active CVD tells as of 2026-08-15:** 360ONE, GRAPHITE, ANANTRAJ, LLOYDSENGG, FCL, ABB, ACE, NETWEB, 63MOONS.
> **Stocks with no tell / distribution:** SBIN, SONATSOFTW, GRASIM, 3MINDIA.
>
> Continue from `docs/cvd-session-handoff.md`.

---

## Files to Know

| File | Purpose |
|---|---|
| `docs/cvd-observations.md` | Running observation log — all stocks, all findings, false positive analysis |
| `docs/cvd-session-handoff.md` | This file — resume prompt and stock status |
| `tradingview-mcp/docs/analysis-framework.md` | Full methodology — anchors, wicks, two regimes, fetch instructions |
| `/tmp/*-cvd.json` | Cached data files (refetch if > 1 day old) |

---

## Key Caution

Everything in this document is **observational**. These patterns have been noticed across ~15 stocks over 3 years of data. They have not been backtested, are not proven edges, and may be coincidental. The sample sizes are small. Use as context, not as rules.
