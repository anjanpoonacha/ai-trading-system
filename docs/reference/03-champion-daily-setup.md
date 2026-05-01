# Champion Daily Setup (CDS) - Reference Document

## Trading Style & Timeframe

**Style:** Swing Trading (few weeks to few months average hold)
- **Primary:** Daily chart
- **Secondary:** Weekly chart
- **Optional:** 5-15 min for entry timing

**Approach:** Pre-breakout trading — buy BEFORE breakout (not at breakout)

## Stock Selection Criteria

| Criterion | Requirement |
|-----------|-------------|
| Stage | Stage 2 (or Stage 1B exceptional) |
| Base Duration | Minimum 20 candles |
| Volatility (TRP) | >2% preferred (>3% ideal) |
| Liquidity (India) | >7 CR avg daily turnover (minimum), >10 CR preferred |
| Liquidity (US) | >$3M avg volume |
| Liquidity Formula | Minimum ADT = Avg Position Size × 75 |
| Price Action | Clean, smooth (not choppy) |
| Volume | Clear expansion/contraction cycles |

**Rule:** Higher capital → higher liquidity required → fewer options

**Avoid:** Wide bid-ask spread, impact cost, illiquid stocks

## Base Analysis - Structural Features

### 1. Smooth/Wavy/Rounding Structure
- Smooth price action with clear waves
- Rounding at BOTTOM (not topping)
- **Avoid:** Choppy bases, excessive wicks, topping structures, breakdowns

### 2. PPCs (Powerful Price Candles)
- Multiple clean PPCs with volume expansion
- Large green candles with good close
- Indicates accumulation

### 3. Volume Variation
- Clear expansion/contraction cycles
- Most important AFTER center point (longer bases)
- **Positive:** High volume before base → dry volume during base → expansion after turnaround

## Base Analysis - Timing Features

### 4. Turnaround
**Definition:** Stock stops making lower lows/highs, reverses upward
- **Required:** Deep bases with downward structure
- **Not required:** Shallow/short bases near highs

### 5. Wake-Up Calls (WUC)
Strange/powerful action increasing breakout likelihood:

#### A. Mini Base Breakout (MBB)
- Smaller structure within larger base breaks out
- Often with volume expansion
- Often equals turnaround

#### B. Breakout Attempt (BA)
1. Breaks resistance, pulls back
2. Approaches resistance closely, pulls back
3. Breaks out briefly, returns to base
- Often shows volume expansion

#### C. Earnings Flush (EF)
- Sharp fall after earnings
- Immediate bounce (2-3 days)
- Can occur mid-base (early entry) or late-base

#### D. Gap Up (GU)
- Clear gap between previous high and current low
- Often with volume expansion
- **Earnings Gap (EG):** Stronger wake-up call
- **Note:** Must occur at RIGHT LOCATION (after base formation)

### 6. Pullback
**Definition:** Down-swing after turnaround/wake-up call
- Only pullbacks AFTER turnaround relevant for entry
- **Logic:** Buy after pullback to catch next expansion

### 7. Contraction or Congestion
**Contraction:** Candle size significantly smaller than average volatility
- Best: 2+ consecutive contracted candles

**Congestion:** Price trades within tight zone (similar-sized candles, confined area)

**Location:** After pullback, before anticipated breakout

**Logic:** Markets cycle (expansion → contraction → expansion). Buy after contraction to catch next expansion.

## Entry Rules

### Prerequisite
Stock must close above previous day's high

### Trigger Identification
- **Trigger Bars:** Contracted/congested bars after pullback
- **Trigger Level (TL):** High of trigger bars

### Entry Methods

#### Method 1: Standard Entry (Recommended)
1. **First 50%:** Buy on break above TL
2. **Remaining 50%:** Buy if closes comfortably above TL (check last 30 min)
   - If no comfortable close: mark high of entry day
   - Next day: if breaks that high → buy remaining 50%
   - Repeat if needed

**Logic:** Break of TL = first confirmation; close above TL = second confirmation

#### Method 2: Buy at Close
- Wait last 30-60 minutes
- If closes above previous day's high → buy full position at close

#### Method 3: Live Entry (Advanced)
- Buy 100% immediately on break of TL
- Higher risk (full loss vs. half loss)
- Wait 10-15 minutes after break (avoid fakes)
- Check volume expansion
- Exceptional setup → build 100% in installments (25% + 25% + 25% + 25%)

**Lower Timeframe Refinement (5-15 min):**
1. Wait for close above TL on LTF
2. Wait for break of high of breakout candle
3. Buy 50% at close, 50% on follow-through PPC

## Stop Loss Rules

### Standard Formulas

| Method | Formula | Description |
|--------|---------|-------------|
| **Normal** | Entry - TRP% | Moderate stop |
| **Conservative** | TL - TRP% | Broader stop |
| **Aggressive** | Low of entry bar OR swing low | Tighter stop |

**TRP:** Average daily volatility

**Rule:** Stop-loss must not exceed 2× TRP in any case

### Trade-offs

| Stop Type | Win Rate | R-Multiple | Risk |
|-----------|----------|------------|------|
| Broad | Higher | Lower | Less whipsaw |
| Tight | Lower | Higher | More whipsaw, better R if works |

### Execution Rules
1. **Treat initial stop as HARD stop** — exit immediately when hit
2. **Place stop orders in advance** (prevents emotional interference)
3. **Exception (large positions/illiquid):** Exit manually in 1-min intervals across 2-3 installments
4. **After sufficient move:** Set alerts instead of daily stops
5. **First 10 minutes:** Use alerts only (price discovery period)
   - If sustains below stop after 10 min → exit
   - If recovers within 10 min → hold
   - After 10 min → strict hard stop

## Exit Strategy

### 1. Mathematical Exit (First Exit - Always)

Exit 20-40% when:

| Condition | Action |
|-----------|--------|
| Closes above 2R | Exit 20-40% at close (last 30-60 min) |
| **OR** Breaches 3R intraday | Exit 10-20% |
| **AND** Breaches 4R intraday | Exit another 10-20% |

**Total:** 20-40% between 2R and 4R

**After Mathematical Exit:**
- Revise stop to cost (entry price)
  - **OR** revise to cost for 50%, keep initial stop for other 50%
- Use soft stop (give room, wait 10-30 minutes if breached)

### 2. Extension Exits

**Extension:** Abnormally higher move from swing low on daily timeframe

| Type | Multiplier | Example (3% TRP) | Partial Exit |
|------|-----------|------------------|--------------|
| Normal | 4× TRP | 12% | 20% |
| Great | 8× TRP | 24% | 40% |
| Extreme | 12× TRP | 36% | 80-100% |

**Measurement:** From swing low to current high

**Triggers:**
- Consecutive positive large candles
- Single exceptionally huge day candle

**Action:** Exit on daily close (last 30-60 minutes)

**After First Extension Exit:**
- If > 6R → aim to ride larger move
- Trail using 50 SMA (hold while above, exit if sustains below)

**After Second Extension Exit:**
- Tighten stop-loss
- Trail using 20 SMA

### 3. Trailing Stop Rules

**During Extension:**
- Mark low of each daily candle
- Highest recent low = trailing stop (SOFT stop)
- If large PPC (>2.5× TRP): use midpoint instead of low

**Soft Stop:** Hold 15-30 min if broken; check LTF for sustained break

**Minimum Exit:** 20% (never less)

### 4. Final Exit Rules

**Primary Method:**
- Stock closes below 50 DMA AND undercuts it
- Use low of that candle as soft stop
- Exit 100% when low breached

**Alternative (Support Zone):**
- Use clear support level instead of 50 DMA
- Wait for close below support
- Exit on break of that candle's low

**Fast Trend Exception:**
- If floats above 20 DMA for 3 months
- Use 20 DMA instead of 50 DMA
- "Floating" = not violating 20 DMA, bouncing off repeatedly

**Market-Wide Fall Exception:**
- Clean bull market with sudden broad selloff
- If closes below 50 DMA with market
- Give one extra day
- Exit only if continues down second day
- Does NOT apply to single-stock declines

### 5. Weakness Exits

| Trigger | Action |
|---------|--------|
| Break below initial stop-loss | Exit immediately (hard stop) |
| Break below 20 or 50 SMA (if trailing) | Exit (soft stop) |
| Break below significant support | Exit (soft stop) |
| Significant bearish day (large red candle, gap down with huge volume, significant NPC) | Exit (soft stop) |

**Rule:** Hard stops ONLY for initial stop-loss. Trailing stops (profitable) use soft stops with room.

## Mass Booking

### Definition
Protective exercise to book partial gains proportionally across all positions when market rewards handsomely.

### Trigger (Mathematical Rule)
**When unrealized gains cross 7% of account value:**
- Exit all positions by 30% proportionally
- Applies to all stocks (profitable, breakeven, small loss)

**Example:** $500K account → trigger at $35K unrealized gain

### Execution Methods

**Method 1 (Basic):**
- Exit all by 30% at close (last hour)

**Method 2 (Recommended - Tight Trailing):**
- Set tight trailing stops on all positions
- Large PPC: use midpoint
- Small candles: use previous/current day low
- Captures additional gains if market continues
- Exits automatically on reversal

### Post-Mass Booking
- Manage remaining 70% as if mass booking never happened
- Follow normal exit rules per stock

**Note:** OPTIONAL, not mandatory. Use Champions Journal position manager for real-time tracking.

## Earnings Management

### Checking Earnings Dates
1. Exchange websites (NSE, BSE, NASDAQ, NYSE) - most authentic
2. MarketSmith - indicator plots dates
3. TradingView - "E" markers (sometimes inaccurate for Indian stocks)
4. Broker platforms

### Entry Rules Around Earnings
**Positive:** Earnings often produce wake-up calls (MBB, flush, gap up)

**Avoidance Rule:** Do NOT enter if earnings due within 3 days (gap down risk below stop)

### Exit Rules Around Earnings

**During Market Hours:** Manage in real-time; be active if near stop

**After Hours (Gap Risk):** Evaluate:
1. Distance from price to stop
2. Distance from entry to stop
3. Open risk % for trade
4. Tightness of stop

**Decision Matrix:**

| Situation | Action |
|-----------|--------|
| Sufficiently profitable | Hold |
| Near stop + tight stop | Exit before earnings |
| Near stop + broad stop | Hold or reduce 50% |
| Large unrealized gain | Book partial gains |

**Guidelines:**
- Tight stop (1%) + 4% gap = 4× planned risk → consider exit
- Broad stop (4%) + 4% gap = within planned risk → can hold

---

## Complete Setup Checklist

**Stage 1: Stock Selection**
- [ ] Stage 2 (or Stage 1B)
- [ ] Minimum 20-candle base
- [ ] TRP >2% (>3% ideal)
- [ ] Sufficient liquidity (>7 CR India, >$3M US)
- [ ] Clean price action

**Stage 2: Base Analysis**
- [ ] Smooth/wavy/rounding structure
- [ ] PPCs within base
- [ ] Volume variation
- [ ] Turnaround (if deep base)
- [ ] Wake-up call (MBB, BA, EF, GU/EG)

**Stage 3: Base Timing**
- [ ] Pullback after wake-up call
- [ ] Contraction or congestion
- [ ] Identify trigger bars and TL

**Stage 4: Entry**
- [ ] Stock closes above previous day's high
- [ ] Standard: 50% on break of TL, 50% on comfortable close above TL
- [ ] OR Live: 100% on break of TL (advanced)
- [ ] OR Close: 100% at close if closes above previous day's high

**Stage 5: Risk Management**
- [ ] Calculate stop (Entry - TRP%)
- [ ] Place stop order (or alert for large positions)
- [ ] Exit immediately if stop hit

---

**Character count: 10,847**