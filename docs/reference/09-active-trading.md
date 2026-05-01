# Active Trading Reference

## Core Concepts

**Active Trading Definition:**
- Higher trade frequency through faster exits and/or tighter stop losses
- Increased capital turnover and position sizing
- Requires continuous market monitoring

**Two Approaches:**
1. Quicker exits only (reduce holding period)
2. Quicker exits + tighter stop losses (increases position size, requires more monitoring)

---

## Key Differences from Standard Trading

| Factor | Active Trading | Standard Trading |
|--------|---------------|------------------|
| Time/Effort | Higher | Lower |
| Skill Required | Higher (execution, re-entries, tight stops) | Lower |
| Scalability | Lower (difficult beyond ₹5-10 crores) | Higher |
| Execution Speed | Critical — must be fast and agile | Less critical |
| Stop Loss Gap | Tighter (below TRP) | Standard (at TRP) |
| Holding Period | Days to few weeks | Weeks to months |
| Win Rate | Lower (35%+ target) | Higher |
| R-Multiple Potential | Higher (3+ target) | Lower |
| ROI Potential | Higher maximum | Lower maximum |

**Stop Loss Risk Example:**

| Style | Entry | Stop Loss | Actual Exit | Gap | RPT | Loss |
|-------|-------|-----------|-------------|-----|-----|------|
| Standard | 100 | 96 (4%) | 95 | 1 pt | 1% | 1.25% |
| Active | 100 | 99 (1%) | 98 | 1 pt | 1% | 2.0% |

*Same 1-point slippage causes 2x loss in active trading due to tighter stop.*

---

## Performance Targets

| Metric | Target Range | Notes |
|--------|--------------|-------|
| RPT | 0.3% - 0.7% | Average ~0.5% over long period |
| Win Rate | 35%+ | Minimum threshold |
| ARR | 3.0+ | Can reach 4.5+ with high R-multiple trades |
| Trades/Year | 150 - 300 | Depends on market conditions |

**Performance Scenarios (Monthly Compounding):**

| RPT | ARR | Trades/Year | Win Rate | Annual Return |
|-----|-----|-------------|----------|---------------|
| 0.5% | 3.0 | 160 | 35% | 37% |
| 0.5% | 3.0 | 220 | 35% | 54% |
| 0.5% | 3.0 | 220 | 38% | 76% |
| 0.5% | 4.5 | 220 | 30% | 100% |
| 0.5% | 4.5 | 220 | 35% | 216% |

*Key: ARR improvement (via high R-multiple trades) has dramatic impact on returns.*

---

## Entry Rules

1. **Buy as near as possible to trigger level** — no waiting for extended confirmation
2. **Stop loss must be lower than TRP** (stock's Typical Risk Percentage)
3. **Day-of-entry close check:**
   - If stock closes back below trigger level → exit partially or fully
   - Re-enter next day if it breaks out again
   - Reason: Tight stop loss + potential gap-down risk
4. **Trail to cost immediately** after 1.5-2R move or first strong green candle
5. **Be ready for re-entries** — may fail 2-3 times before working
6. **Adjust RPT by market stance:**
   - Weak markets: 0.2% - 0.3%
   - Strong markets: 0.5% - 0.7%

---

## Exit Strategy

### Primary Goals
- Capture 1-2 swings, not the full trend
- Exit before meaningful pullback
- Exit on strength (close), not weakness (low of day)

### Exit Rules

1. **Minimum exit size: 30%** per installment
2. **Exit in 1-3 parts maximum**
3. **Final part must be ≥20%** — if next exit would leave <20%, either:
   - Take a larger exit now, or
   - Hold and exit fully later
4. **Do not exit too early** — ask: "Is this one of my three exit opportunities?"
5. **Prefer close over LOD** for exits (exit on strength)
6. **20 DMA = ultimate weakness level** — do not hold below it
7. **Accept stocks flying after exit** — you captured the swing, not the trend

### Exit Triggers

| Condition | Action |
|-----------|--------|
| First strong PPC after entry | Exit 30%, trail stop to cost |
| Second/third strong PPC | Exit 30% |
| Stock extended with small candles | Use LOD trailing |
| Huge candle (15-20%+) | Exit 50-70% or full position |
| Near 6R with no recent exit | Exit 30% or trail tightly |
| Close near LOD after big move | Use LOD for exit |
| Stock below 20 DMA | Exit fully |
| Final 20% held + wide gap to 20 DMA | Consider full exit to avoid long hold |

**PPC = Positive Price Candle (strong green candle)**

---

## Setup: Squeeze Between 20 DMA and 50 DMA

**Criteria:**
- Price contracts between 20 DMA and 50 DMA for ≥2 bars
- Volume decreases during squeeze
- Must occur at right location (after base, near breakout level)
- Not a traditional VCP, but valid if squeeze is tight

**Entry:**
- Mark trigger level at top of squeeze
- Wait for breakout with slight confirmation (not instant)
- Use lower timeframe (10-min) to refine entry and stop loss
- Enter as close to trigger as possible

**Stop Loss:**
- Place below recent swing low on lower timeframe
- Must be tighter than TRP
- Typical range: 0.9% - 2.0%

---

## Trade Management Examples

### Example 1: NIIT Limited
- Setup: Squeeze between 20/50 DMA after stage 2 transition
- Entry: Breakout of trigger level (lower timeframe confirmation)
- Stop: Tight stop below swing low (~1%)
- Exits:
  - 30% at first big PPC (6R)
  - 30% at second PPC
  - 40% at third PPC (24R final exit)
- Result: Captured main swing, avoided subsequent base-building

### Example 2: COLPAL
- Setup: Rounding base with squeeze
- Entry: Breakout on 10-min chart
- First attempt: Closed below trigger → exited at close
- Re-entry: Next day breakout (stop ~0.9%)
- Exits:
  - Trailed to cost immediately
  - 30% at 6R (after 10 days, protect gains)
  - Hit cost on pullback → full exit
- Re-entry #2: New base breakout (stop ~1%)
  - 30% exit using LOD (protect gains)
  - 30% at PPC
  - 40% final exit at double PPC

### Example 3: Birlasoft
- Setup: Stage 1B breakout, fast base along 20 DMA
- Entry: Congestion breakout (tight stop)
- Exits:
  - 30% at first PPC next day
  - Trail to cost
  - 30% at third PPC
  - Used LOD trailing during extension
  - 40% final exit via LOD
- Result: ~20-25R average

### Example 4: GICRE
- Setup: Post-earnings squeeze between 20/50 DMA
- Entry: Breakout (stop ~1.3%, TRP 3%)
- Exits:
  - 30% at huge first-day candle, trail to cost
  - Option: Trail tightly or exit 30% after 5 green candles
  - Full exit at 20% candle (huge swing captured)
- Note: When you see a crazy extended move, exit fully

### Example 5: Skipper Limited
- Setup: V-rounding structure, contraction near 50 DMA
- Entry: Trigger breakout (stop ~2%, TRP 4.8%)
- Exits:
  - Trail to cost day 1
  - 30% at huge candle day 2
  - 50% at upper circuit (20% move) — extended
  - Full exit of final 20% when near 20 DMA with wide gap
- Reason: Captured swing, avoid holding through long consolidation

---

## Execution Checklist

**Pre-Entry:**
- [ ] Confirm setup on weekly chart (stage transition)
- [ ] Identify base and trigger level on daily chart
- [ ] Check for squeeze or contraction pattern
- [ ] Drop to 10-min chart for precise entry/stop

**Entry:**
- [ ] Wait for trigger break with slight confirmation
- [ ] Enter as close to trigger as possible
- [ ] Place stop loss tighter than TRP
- [ ] If closes below trigger same day → exit partially/fully

**Post-Entry:**
- [ ] Trail to cost after 1.5-2R or first strong candle
- [ ] Monitor for PPCs and extension
- [ ] Exit minimum 30% at each decision point
- [ ] Use LOD trailing when extended
- [ ] Exit fully if below 20 DMA

**Exit Decision:**
- [ ] Ask: "Is this one of my three exits?"
- [ ] Protect gains — don't let big moves reverse
- [ ] Accept leaving gains on table after exit
- [ ] Final part must be ≥20%

---

## Risk Management

- **Tight stops increase slippage risk** — 1-point gap = 2x loss vs. standard
- **Trail to cost quickly** to make trade risk-free
- **Reduce RPT in weak markets** (0.2-0.3%)
- **Increase RPT in strong markets** (0.5-0.7%) only on high-conviction setups
- **Do not use high RPT with tight stops** unless ultimate setup
- **20 DMA is hard stop** — never hold below it
- **Manage re-entry risk** — may take 2-3 attempts before success

---

## Key Mindset Shifts

1. **Speed over perfection** — execution must be fast
2. **Swings, not trends** — capture 1-2 swings and exit
3. **Exit on strength** — don't wait for weakness
4. **Protect gains aggressively** — tight trailing after big moves
5. **Accept re-entries** — failures are part of the process
6. **Accept missed moves** — stocks will fly after you exit
7. **Higher skill required** — only trade this style with experience