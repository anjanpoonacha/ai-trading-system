# CDS Examples: Real Trade Analysis

## Entry Methodology

### Two-Part Entry System
| Entry Type | Trigger | Quantity | Stop Loss |
|------------|---------|----------|-----------|
| Method 1 | Close above trigger | 100% | Entry - TRP% |
| Method 2 (Preferred) | Break of trigger + close above | 50% + 50% | Entry - TRP%, then avg - TRP% |

**Method 2 Contingency:**
- If 2nd entry doesn't trigger: buy remaining 50% on break of previous day's high
- Revise stop to: new average price - TRP%
- If stop hit before full position: exit entirely, wait for NEW setup

**Early Entry Conditions (Live Traders):**
- Great PPC + good structure + pullback to 20/50 DMA + nice contraction
- Full entry with tight stop on extremely strong setups only

**Exception Rules:**
- **Large candles:** If breakout candle has huge upper wick, use 15-min/10-min chart for confirmation. If no close above trigger, only 50% entered; remaining 50% requires next day's high break
- **Earnings trigger:** If earnings cause trigger break → buy 100% ASAP
- **Extended moves:** Never buy after large upswing (6-7+ consecutive green candles). Wait for: (a) downswing completion, or (b) sideways consolidation. Tight stops require precise entry at pullback end

### Trigger Bar Identification
1. Very small body and range after pullback
2. Low volume
3. End of downswing
4. High of trigger bar = entry level
5. During drift down, ALL bars are potential triggers — enter when any high breaks

### Base Quality Requirements

**Structure Features:**
- Rounding structure (smooth, wavy bottoms)
- Volume contraction within base, expansion on breakout
- Clean bottoms (no erratic spikes)
- Multiple PPCs = strength
- 1-2 bar contraction after pullback

**Base-on-Base Formation:**
- Second base forms on top of first base breakout level
- Extended consolidation at same price level
- Higher time correction → better breakout potential

**Post-Abnormal Move Rule:**
- After 1000%+ moves, stock requires larger time correction and base
- Small bases immediately after abnormal moves are invalid
- Wait for extended consolidation + earnings declaration

**Base Types:**
| Type | Length | Depth | Characteristics |
|------|--------|-------|-----------------|
| Shallow Short | 30-35 days | Above 20 DMA | Quick entry needed, may lack wake-up calls, enter on structure turn + contraction |
| Deep | Varies | Below 20/50 DMA | More time to enter, clearer signals |
| Stage 2A | 4-5 bars after Stage 2 breakout | Varies | High probability, large R-multiple potential |
| Stage 1B | Within Stage 1 | Larger than first base | Second, larger base after failed breakout |

### Wake-Up Call Signals
1. Mini base breakout (MBB) with volume expansion
2. Gap-up candle with huge volume
3. Large PPC after consolidation
4. Earnings gap: gap up → close back down
5. Earnings shock: sharp drop → recovery and tightening (transparent red candle: close > open, holds 50 DMA)
6. Small range breakout within base with strong volume

**Volume Transition After Wake-Up:**
- Compare volumes to wake-up candle, NOT pre-wake-up base volumes
- Pullback volumes must contract relative to wake-up candle
- Old volume baseline no longer relevant

**Multiple Shakeouts = Quality Setup:**
- Each failed breakout removes weak hands
- Remaining holders have stronger conviction
- Reduces supply overhead
- Increases breakout probability

### Pyramiding (Second Entry)
**Conditions:**
1. First breakout unconvincing (mild breakout, fell back into base)
2. Stock remains within first base high
3. Earnings shock occurs (sharp drop → recovery and tightening), OR
4. Mini base breakout after Entry #1
5. Stock pulls back after mini base breakout
6. New trigger bar forms

**Execution:**
- Can add to position at higher price if took Entry #1
- Valid standalone if missed Entry #1
- Treat as second trade with same exit rules
- Manage stop loss independently

### Wavy Bottom Pattern (WBP)
**Structure:**
- Wave-like price movement (V-V pattern) at base bottom
- Volume expansion toward right side
- Stock approaches/breaches previous resistance with volume
- Pullback to 20/50/200 SMA for entry

**Entry Conditions:**
1. Wait for stock to hit previous stop with volume expansion
2. Wait for pullback to 20/50/200 SMA
3. Identify trigger bar (contraction or halt)
4. Execute: Live (break of trigger high), Close (at trigger close), or 50/50 split

**Context Requirements:**
- Preferably within Stage 1B or Stage 2
- Weekly chart shows strong base or inverse head & shoulders
- Daily chart reveals WBP structure
- Volume pickup on right side

### Weak Setup Indicators (Avoid)
1. **Late Stage Base:** Base after extended Stage 2 run
2. **Loose/Choppy Price Action:** Wild, erratic movement
3. **Topping Patterns:** Head & shoulders, rounding top
4. **Poor Volume Features:** No contraction in base, no expansion on breakout
5. **NPCs and Gap Downs:** Base starting with NPC, failed breakout + gap down with volume

## Exit Strategy

### Mathematical Exits (First Priority)
| Condition | Exit Quantity | Timing | Stop Revision |
|-----------|---------------|--------|---------------|
| Close above 2R | 20-40% | End of day | Move to cost (soft stop) |
| Intraday breach 3R | 10-20% | Intraday | — |
| Intraday breach 4R | 10-20% | Intraday | Total first exit: 20-40% |

**Stop Revision After First Exit:**
- **Method 1:** Revise stop to cost (entry price), use soft stop
- **Method 2:** 50% of remaining at cost, 50% keep original stop

### Extension-Based Exits
**Measuring Extensions:**
- Always from swing low (clear downswing, not 3-day pause)
- TRP recalculates at each swing low
- Patterns: 5 consecutive positive candles with 2 large bars, back-to-back large candles

| Extension Type | TRP Multiple | Exit % | Remaining |
|----------------|------------|--------|-----------|
| First Extension (2-3R) | Straight-line move | 60-80% | 10-20% |
| Second Extension (5-6R) | Continued straight-line | 90%+ | 5-7% |
| Mega Extension (13R+) | Extreme parabolic | 80-95% | 5-20% |

**Large Candle Rule:**
- If candle >2.5x TRP: use midpoint as trailing stop
- If closes below midpoint: revert to low of day

**Abnormal R-Multiple Management:**
| R-Multiple | Action | Remaining Position |
|------------|--------|-------------------|
| 9.5R in 3 days | Lock down majority | Hold 20-25% max |
| 12R+ in 2 weeks | Book large quantities | Hold 10-20% |
| 20R+ | Exit 100% or 95% | Hold 5-7% if any |
| 34R in 5 days | Exit 99% | Hold 5-7% if any |
| 55R (Ultimate) | Exit final tail | 0% |

### Trailing Stop Management

**Stop Types:**
- **Hard stop:** Initial stop loss (always exit, no discretion)
- **Soft stop:** Trailing stop; intraday break allowed if first 10-min candle closes back above

| Position Stage | Trailing Method | Notes |
|----------------|-----------------|-------|
| After 2R-4R exits | 50 SMA | Maximum room |
| After 1st extension | 50 SMA | Hold 10-20% |
| After 2nd extension | 20 SMA | Hold 5-7% |
| Final 20% | Very tight (NOT 50 DMA) | Exit on first opportunity |

**Soft Stop Implementation:**
1. **Close-based:** Wait for candle close below SMA
2. **TRP-based:** Exit if close is below SMA by half of TRP% (e.g., 6.3% → 3.15%)
3. **Confirmation:** If close slightly below SMA, wait for next day to breach previous candle's low

**Moving Average Exits:**
- **50 DMA:** Close below → mark low → break and sustain below = full exit
- **20 DMA (90+ day rule):** If stock floats above 20 DMA for >90 days, close below 20 DMA = exit 50-100%

**Low-of-Day (LOD) Trailing:**
1. **Trigger:** Use only when stock is extended
2. **Mark:** Draw horizontal line at low of each extended day
3. **Update:** Move line up to low of next day if higher low
4. **Exit:** Close below previous day's low = exit signal
5. **Exception:** If price goes below but closes above previous low → keep original line (highest low)

**Ultimate Weakness Exit:**
- Convincing break below 50 SMA (close > 0.5 TRP below), OR
- Break below significant support level with volume, OR
- Multiple red candles closing below both 20-day and 50-day MA with volume
- Exit ALL remaining positions

### Discretionary Exit Signals
1. Extreme extension immediately after entry
2. Weak price action: drifting up with small candles
3. Rounding top formation after extreme move
4. Break of 20 DMA after floating >90 days
5. Rounding structure on lower timeframe = weakness

### Earnings Management

**Pre-Earnings Position Management:**
| Scenario | Profit Cushion | Action |
|----------|----------------|--------|
| Well above entry | Yes | Can hold through earnings |
| Near cost price | No | Exit or lighten position |
| Below initial stop risk | No | Must exit — never risk loss > initial stop |

**Earnings Rules:**
1. **Before earnings:** Do NOT trade if earnings within 3 days of trigger
2. **Earnings gap:** Gap up → close back down = wake-up call
3. **Earnings trigger:** If earnings cause trigger break → buy 100% ASAP
4. **Post-earnings:** Wait for pullback + contraction for standard entry
5. **Earnings turnaround:** Stock reverses from weakness within base following positive earnings = wake-up call

**Earnings Gap Down Response:**
- Use soft stop loss (not hard stop)
- Monitor intraday for 10-20-30 minutes
- Allow room to recover
- Exit only if price sustains below stop for 15-20 minutes

**Earnings Date Verification:**
- **US Market:** TradingView accurate
- **Indian Market:** Use NSE India website → List → Announcements → Event Calendar

## Risk Management

### Stop Loss Placement
- **Standard:** TRP distance from entry
- **Tight:** Low of trigger candles (experienced traders only)
- Tight stop increases R-multiples exponentially but higher premature exit risk

### Intraday Verification
- Check 10-min chart to confirm low of day breaks
- First candle breaks can often be held
- Rounding structure on lower timeframe = weakness signal

### Circuit Breakers
- **Upper circuits:** Continue trailing with low of day
- **Lower circuit:** Cannot exit at low of day → place market order for next day

## Position Management Philosophy

**Swing Trading Timeline:**
- Majority (60-80%) exits in first few weeks
- Small position (10-20%) held for months
- Tiny position (5-7%) for maximum trend capture

**Position Sizing Through Trade:**
| Exit Point | % Exited | Cumulative Exited | Remaining |
|------------|----------|-------------------|-----------|
| 2R (Mathematical) | 20-40% | 20-40% | 60-80% |
| 5-6R (Extension) | 30-40% | 50-80% | 20-50% |
| 13R+ (Mega Extension) | Most remaining | 80-95% | 5-20% |
| 55R (Ultimate) | Final tail | 100% | 0% |

**Clean Position Management:**
- Exit completely at large gains (20R+) for swing trading
- Holding tiny positions (5-7%) requires daily monitoring
- Always exit completely on ultimate weakness

**Goal:** Capture initial momentum with bulk of position, ride extended trends with small remainder.

## Buying Climax Pattern

### Definition
**Climax:** Extreme price/volume action at end of strong Stage 2 move, marking exhaustion.

### Characteristics
- Occurs after steep, extended Stage 2 rally
- Highest-ever or exponentially expanded volume
- Large price bars with minimal pullbacks
- Stock significantly detached from 50-day MA

### Volume Interpretation at Climax
| Participant | Action | Logic |
|-------------|--------|-------|
| Institutions | **Selling** | Taking profits after large move |
| Retail | **Buying** | FOMO; chasing momentum |

### Post-Climax Behavior
1. Stock becomes volatile/choppy → Stage 3 (distribution)
2. Eventually breaks down to Stage 4
3. **Exception:** Smooth, orderly base (not choppy) may reset for another Stage 2

**Time Correction Rule:** Steep, straight-line Stage 2 move → Requires **larger time correction** to reset (e.g., 23 weeks / 160 days).

**Indicators of Proper Reset:**
- Smooth price action (not wild/volatile)
- Consistently above 50-day MA
- Low volume on pullbacks
- Volume expansion on rallies (PPCs)

## Real Trade Examples

### Shyam Metals (SHYAMMETL)
- **Weekly:** Stage 4→1→2 breakout, base ₹250-₹300, breakout >₹400 with volume
- **Daily:** Earnings gap wake-up call → pullback to 20/50 DMA → trigger ~₹177.50
- **Exits:** 17% (2R) → 20% exit | 24% move, TRP 3.3 (great) → 40% exit | Close below 50 DMA → final 40%
- Rounding top visible before final exit

### Olectra Greentech (OLECTRA)
- **Weekly:** Stage 4 → Stage 1 (large green candle, massive volume)
- **Daily (Stage 1B):** V-V structure ₹155-₹175, earnings gap → pullback to 20 DMA → trigger (TRP 4.3%)
- **Exits:** 57% move, TRP 4.8 (great) → 40% exit | Extreme extension option: 60% exit | Final 20% on low break
- Rounding structure on lower timeframe = weakness

### Patel Engineering (PATELENG)
- **Weekly:** Stage 4→1→failed 2→4→2 (large volume spike)
- **Daily:** 35-day shallow base above 20 DMA → trigger at contraction high
- **Exits:** Three upper circuits → 20% exit | Six circuits total, 44% move, TRP 5.4 (great) → 40% exit | Break below 20 DMA after 90+ days → final 40%
- Total: 85% in 77 days

### Tata Motors (TATAMOTORS)
- **Weekly:** Clean Stage 2, first base within Stage 2
- **Daily:** Failed breakout → earnings next day → DO NOT TRADE | Post-earnings gap → pullback to 20 DMA → contraction → trigger
- **Exits:** 13% (2R) → 20% exit | 15% move, TRP 2% (7x) → soft stops | 14% (2R) → 20% exit | 21% (great) → 40% exit | Close below 20 DMA after 90+ days → final 40%
- Small base: quick entry needed, avoid if earnings within 3 days

### Angel One
- **Weekly:** Breakout, forming base within higher breakout area
- **Daily:** Short shallow base along 20 DMA, rounding features, PPCs, contraction, volume variation
- **Entry:** Live trader: full entry with tight stop | Standard: 50%/50%
- **Exits:** 2R → 20% exit | 42% move, TRP 4% (10x, great) → 40% exit | 2R → low of day | Break below 20 DMA after 90+ days → final 40%

### Neuland Laboratories (NEULANDLAB)
- **Weekly:** Stage 4→1→2, focus on small base within Stage 2
- **Daily:** 30-day shallow base along 20 DMA → earnings in 3 days → DO NOT TRADE
- **Post-earnings:** PPC, breakout with huge volumes → pullback → contraction → **earnings at 1:55 PM triggered breakout** → buy 100% ASAP
- **Exits:** 50% move, TRP 4.3% (11-12x, extreme) → 60-100% exit options | 34% move, TRP 4.8% (2R) → final 20%
- Earnings trigger = strong setup, buy fully immediately

### CDSL
- After steep rally with climax, first entry failed (too early)
- Successful entry after **23 weeks / 160 days** of smooth base building
- Multiple shakeouts within base = exceptionally strong setup
- Earnings turnaround provided wake-up call

### BAJAJHIND
- Inverse head & shoulders on weekly, WBP on daily
- Earnings shock created pullback to 20 SMA
- Trigger bars formed, entry at ~12 INR

### AMC Entertainment
- Post-1000% move (₹10 → ₹100)
- Required extended consolidation before valid setup
- Achieved 9.5R in 3 days, 34R in 5 days
- Abnormal gains → immediate profit-taking (99% exit)

### LSIL (Lloyd Steel)
- Stage 2A: base 4-5 bars after Stage 2 breakout
- Wake-up call: range breakout with volume spike
- Multiple trigger bars during drift down
- First extension exit at ~11R
- Second extension exit at ~20R (complete exit for swing trading)

### CDSL
- After steep rally, massive volume spike at peak = buying climax
- Post-climax: volatile/choppy → Stage 3 distribution

### RVLV
- First base breakout at $14 failed, stock formed second base at similar level (base-on-base)
- MBB with volume spike, then earnings shock, then pullback provided entry
- Inverse head & shoulders pattern within base

### AGYS
- 7 consecutive green candles from $78 to $92, breakout at $87 = extended entry (avoid)

### APOLLO
- Sharp rally from 110 to 140+ with no pullback = extended entry (avoid)

### PFC
- Big upswing from consolidation box (260-270) to 285+ = extended entry (avoid)

## Key Definitions
- **TRP:** True Range Percentage; volatility measure for stop distance
- **PPC:** Positive Pivot Candle; large green candle with volume expansion
- **Mini base (MBB):** Small consolidation within larger base
- **Wake-up call:** Signal base is ready (mini breakout, gap-up, large PPC, earnings shock)
- **Soft stop:** Trailing stop allowing brief intraday violation
- **Hard stop:** Initial stop loss; no discretion
- **Extension:** Straight-line price move from swing low
- **Swing low:** Clear downswing bottom (not minor pause)
- **R-multiple:** Risk-reward ratio (profit ÷ initial risk)
- **Stage 2A:** First base within Stage 2 (after Stage 1 breakout)
- **Stage 1B:** Second, larger base within Stage 1 after failed breakout
- **WBP:** Wavy Bottom Pattern; proprietary pattern with wave-like price movement and volume expansion
- **Climax:** Extreme price/volume exhaustion at end of Stage 2
- **Shakeout:** Failed breakout that traps and removes weak holders
- **Volume transition:** Clear, sustained increase in average volume
- **Right Price:** Price from which stock has high probability of moving up without hitting stop

---

**Note:** All rules are guidelines. Discretion allowed after mastering base methodology. Exit mastery comes from experience: taking many trades, studying historical examples, reviewing own trades, iterating on framework.