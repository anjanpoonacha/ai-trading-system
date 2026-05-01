# Champion Daily Setup (CDS)

## Overview

A pre-breakout swing trading setup on the daily timeframe. Buy stocks within their base BEFORE they break out, hold for weeks to months. Primary timeframe: daily. Secondary: weekly. Lower timeframe (5-15 min) for entry timing.

## Prerequisites / Filters

1. **Stage**: Stock must be in Stage 2 (90%+ of trades) or Stage 1B (final phase before S2 breakout)
2. **Base**: Stock must be forming a base — minimum **20 bars** (daily candles)
3. **Volatility (TRP)**: Ideally TRP > 3% (minimum > 2%). TRP = average daily range %
4. **Liquidity**: Average Daily Turnover (ADT) >= average position size × 75. Minimum 7 Cr (India) / $3M (US)
5. **Price action cleanliness**: Smooth, not choppy
6. **Industry strength** (optional but enhances quality): Peers in same sector also strong

## Base Quality Analysis (Analytical Features)

### 1. Smooth / Wavy / Rounding Structure
- Base should be smooth (no excessive wicks, no choppy zigzag)
- Wavy = clear wave swings within base
- Rounding at the BOTTOM (not top — topping structures are bearish)
- Avoid: choppy bases, bases rounding at top, excessive upper/lower wicks

### 2. PPCs (Powerful Price Candles) Within Base
- Large green candles with good close + volume expansion inside the base
- Indicates accumulation by smart money

### 3. Volume Variation
- Clear alternation between volume expansion bars and contraction bars
- Shows repeated accumulation episodes
- Volume dry-up as stock enters base, then pickup after turnaround = excellent feature
- Note: Less visible in large-caps due to high liquidity; clearest in mid/small-caps

### 4. Turnaround
- Stock making lower highs/lower lows, then produces a higher high or higher low
- Signals base is nearing completion
- Not needed in flat/shallow bases (only in deeper bases)

### 5. Wake-Up Call (WUC)
Types of wake-up calls:

| Type | Description |
|------|-------------|
| **MBB** (Mini Base Breakout) | Smaller base within larger base breaks out. Often = turnaround. Found in deeper bases. |
| **BA** (Breakout Attempt) | Stock attempts breakout of resistance, traps breakout traders, pulls back. 3 variations: (a) pierces resistance & falls back, (b) approaches but doesn't reach resistance, (c) breaks out, sustains briefly, then re-enters base |
| **Earnings Flush** | Sharp fall on earnings + immediate bounce (2-3 days). Retail flushed out, smart money accumulates. Very bullish in good base. |
| **Gap Up / Earnings Gap** | Gap up at right location within base. If triggered by earnings = even stronger (Earnings Gap). |

## Timing Features (When to Buy)

### Pullback
- After turnaround/WUC, wait for a down-swing (pullback)
- We buy AFTER pullback, not during up-swing
- Pullback toward 20 DMA = good reference

### Contraction / Congestion
- **Contraction**: 1-2 candles with very small body (significantly smaller than average)
- **Congestion**: 2-3 candles trading within same narrow zone
- Best: price contraction + volume contraction (some of lowest volume in months)
- These form the **Trigger Bars**

## Entry Conditions

### Trigger Level
- Mark the HIGH of the trigger bar(s) = **Trigger Level (TL)**
- Entry triggers when price breaks above the Trigger Level

### Entry Type 1 — Standard (Recommended for beginners)
1. Buy **50%** of position as stock breaks above Trigger Level
2. Wait for close — if stock closes **comfortably above** TL, buy remaining **50%** in last 30 min
3. If stock does NOT close above TL: mark high of entry day → next day if high is broken, buy remaining 50%
4. If next day also fails: mark that day's high → repeat

### Entry Type 2 — Live Entry (Experienced traders)
1. Buy **100%** as stock breaks above Trigger Level
2. Use lower timeframe (5-15 min) for confirmation:
   - Wait for candle to CLOSE above TL on lower TF
   - Or: break of breakout candle's high on lower TF
   - Or: follow-through PPC on lower TF
3. Can build in parts (25% → 25% → 50%) as confirmations come on lower TF

### Entry Type 3 — Close Entry (Less time-intensive)
1. Buy **100% at close** if stock closes above previous day's high
2. Wait for last 60-30 minutes, confirm close is strong
3. May need wider stop (can use swing low, max 2× TRP)

### Lower Timeframe Confirmation (5-15 min chart)
- Look for structure/resistance on LTF matching the trigger level
- Helps avoid fakeouts (e.g., stock pierces TL for seconds then reverses)
- If no solid LTF close above TL → skip entry

## Stop Loss Rules

### Standard Stop Loss (Default)
```
SL = Average Entry Price − TRP%
```
Example: Entry at 100, TRP = 3.5% → SL = 96.5

### Conservative Stop Loss (Broader)
```
SL = Trigger Level − TRP%
```

### Aggressive Stop Loss (Tighter — experienced only)
- Low of entry day candle, OR
- Swing low (bottom of pullback)

### Rules
| Rule | Detail |
|------|--------|
| Hard stop | Initial SL is ALWAYS a hard stop — exit immediately, no second thoughts |
| Place orders in advance | Set SL orders with broker immediately after entry |
| First 10 min exception | Don't trigger SL in first 10 min of market — allow price discovery. If sustains below SL after 10 min, then exit |
| Large position | If stock illiquid for your size, exit manually in 2-3 installments over 1-2 minutes |
| Max SL | Should not exceed 2× TRP |

## Target / Exit Rules — Extension Exit Method

### Goal
1. Exploit price extensions (partial exits on abnormal moves)
2. Ride the trend (trail using moving averages for remaining position)

### Extension Definition
Measured from **swing low** to current high. Compare move size to TRP:

| Extension Level | Move from Swing Low | Exit % |
|----------------|-------------------|--------|
| Normal | > 4× TRP | 20% |
| Great | > 8× TRP | 40% |
| Extreme | > 12× TRP | 80-100% |

Example: TRP = 3%, Normal ext = >12% move, Great = >24%, Extreme = >36%

### Mathematical Exit (First Exit — from CDS-6)
- If stock closes above **2R**: exit 20-40% at close
- If intraday stock breaches **3R**: exit 10-20%
- If intraday stock breaches **4R**: exit another 10-20%
- Total first exit: 20-40% of position between 2R and 4R

### Trailing on Extension
- Use **low of the day** as soft trailing stop when extended
- If extension caused by **large PPC** (candle size > 2.5× TRP): use **midpoint** of that PPC as trailing stop instead of low
- If soft stop broken and sustains 15-30 min → take partial exit
- Minimum exit size: **20%** (never exit less than 20%)

### Trail Using Moving Averages (After Extension Exits)
- After first extension exit and >6R profit: trail with **50 SMA**
- If stock floats above **20 DMA for 3+ months**: switch to 20 DMA for trailing
- After second extension exit: tighten to **20 SMA**

### Final Exit (100% remaining)
1. Stock **closes below 50 DMA** AND next day **undercuts** (breaks low of that candle) → exit all
2. OR: Stock closes below a significant **support zone** + undercuts → exit all
3. If stock floating above 20 DMA for 3 months: use 20 DMA close + undercut instead
4. All trailing stops (except initial SL) are **SOFT stops** — give 15-30 min room, check lower TF

### After First Profitable Exit
- Revise stop loss to **cost price** (breakeven) — at minimum for 50% of remaining position
- Use soft stop at cost

### Special: Market-Wide Fall
- If ALL stocks falling simultaneously in a bull market (not stock-specific)
- Give extra room: wait one additional day below 50 DMA before exiting
- If stock recovers next day → hold

## Position Sizing

```
Position Size = Risk Amount / (Entry Price − Stop Loss)
Risk Amount = Capital × Risk Per Trade %
```

- Standard risk per trade: 0.5% of capital (from example)
- TRP determines SL distance → determines position size
- Higher TRP = wider SL = smaller position size (preferred: TRP > 3% to avoid oversized positions)
- Low-volatility stocks (TRP < 2%) require very large positions — avoid unless setup is exceptional or trading futures

## Mass Booking (Optional — Protective)

- If unrealized gains cross **7% of account value**: cut ALL positions by **30%** proportionally
- Method: Trail all positions with tight stops (low of day / midpoint of large PPCs) and let them exit naturally
- Post mass-booking: manage remaining positions normally using standard exit rules

## Earnings Management

### Before Entry
- **Avoid entry** if earnings announcement due within **3 days** (gap-down risk)
- If setup triggers ON earnings day → it's a STRONGER setup

### During Hold
- If sufficiently profitable (stock far above SL): hold through earnings
- If stock near SL and earnings coming: **exit** or **reduce position by 50%**
- If tight SL (e.g., 1%) and stock near SL: exit before earnings
- If stock extended with no recent partial exit: book partial before earnings

## Scanning Process

1. Filter: Stage 2 stocks (or S1B) with minimum 20-bar base
2. Filter: TRP > 3% (or > 2% minimum)
3. Filter: ADT > 7 Cr (India) / $3M (US), or position size × 75
4. Analyze base quality: smooth/wavy/rounding structure, PPCs, volume variation
5. Check for turnaround (in deeper bases)
6. Look for wake-up calls (MBB, BA, Earnings Flush, Gap Up)
7. After WUC: wait for pullback
8. After pullback: identify contraction/congestion (trigger bars)
9. Mark trigger level (high of trigger bars)
10. Enter on break of trigger level (with confirmation)

## Key Indicators

| Indicator | Purpose |
|-----------|---------|
| TRP (%) | Average daily volatility — used for SL, extensions, position sizing |
| 20 DMA (green) | Short-term trend, tight trailing |
| 50 DMA (white) | Medium-term trend, standard trailing / final exit |
| 200 DMA (purple) | Long-term trend, stage identification |
| Volume | Expansion/contraction analysis, PPC confirmation |

## Summary Flowchart

```
Stage 2 stock → Forming base (20+ bars) → Base quality good?
  → Turnaround seen? → Wake-up call present?
    → Pullback occurred? → Contraction/Congestion formed?
      → Mark Trigger Level → Break of TL = BUY
        → Set SL (entry − TRP%) → Trail with extensions + MAs → Final exit at 50/20 DMA break
```
