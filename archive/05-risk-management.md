# Risk Management

## Position Sizing

**Formula:** `Quantity = (Account Value × RPT%) / (Entry Price − Stop Loss)`

- Always calculate position size using this formula before every trade
- RPT is calculated on current account value (enables compounding automatically)
- In futures: 1 lot ≈ ₹7 lakhs, minimum risk ₹20K–30K per trade

## Stop Loss Rules

1. **Always determine stop loss before entry** — never trade without one
2. **Exit if stop loss is hit** — respect it, no exceptions
3. **Handling**: allow 30–60–90 min sustain beyond SL before exiting (not strict market order)
4. CSS stop loss = 1.5 × TRP (broader due to stage 3/4 volatility)
5. CDS stop loss = TRP from entry price

## Risk-Reward

- **Minimum ARR target: 3.0** (average gains ≥ 3× average loss)
- ARR is the game-changer — small win rate improvements yield massive returns at high ARR
- ARR of 3 + win rate 25% = breakeven
- ARR of 3 + win rate 35% = 57% annual return
- Focus on maximizing R multiples via effective exit techniques

## Win Rate & Expectancy

| Metric | Minimum | Good | Aggressive |
|--------|---------|------|------------|
| Win Rate | 35% | 40% | 45% |
| ARR | 3.0 | 3.5 | 4.0 |
| RPT | 0.5% | 0.75% | 0.9–1.0% |
| Trades/Quarter | 30 | 40 | 45 |
| Trades/Year | 120 | 160 | 180+ |

**Return calculations (with quarterly compounding):**
- Min metrics (0.5% RPT, ARR 3, 30 trades/Q, 35% WR) → **31% annual**
- Mid metrics (0.75% RPT, ARR 3.5, 40 trades/Q, 40% WR) → **94–136% annual**
- High metrics (0.9% RPT, ARR 4, 45 trades/Q, 45% WR) → **460%+ annual**

**Key insight:** ARR of 1 + WR 50% = 0% return. ARR of 3 + WR 35% = 57%. High ARR >>> high win rate.

## Capital Allocation (Open Risk Metric)

### Total Open Risk (TO%)

`TO% = Σ(Open Risk per trade) / Account Value`

**Open Risk per trade** = `Open Quantity × (Entry Price − Current Stop Loss)`
- When SL raised to cost → OR = 0 (risk-free)
- When SL raised above cost → OR = negative (reduces total risk)

### OR Matrix (Maximum Open Risk by Market Stance)

| Market Stance | Conservative | Moderate | Aggressive |
|---------------|-------------|----------|------------|
| Very Strong | 3% | 5% | 7% |
| Strong | 2% | 4% | 6% |
| Moderate | 1% | 2% | 3% |
| Weak | 0.5% | 1% | 1.5% |

### OR Matrix Controls

1. **Should I take a new trade?** → Only if TO% + new trade OR ≤ M (max for current stance)
2. **What RPT for new trade?** → Dictated by remaining headroom under M

| Market Stance | Max RPT (Moderate) |
|---------------|-------------------|
| Very Strong | 1.5% |
| Strong | 1% |
| Moderate | 0.5% |
| Weak | 0.25% |

### Rules
- Monitor TO% daily
- Keep TO% under M at all times
- Reduce intensity (fewer trades + lower RPT) in unfavorable conditions
- Raise intensity in favorable conditions
- Start with moderate appetite; adjust to conservative/aggressive by experience

## Max Risk Per Trade

- Standard RPT: **0.5%–1%** of account value
- Never exceed OR matrix limits
- In weak markets: reduce to 0.25–0.5%
- In very strong markets: can go up to 1.5%
- Ultimate setups (picture-perfect): can double RPT

## Compounding

- No special action needed — RPT calculated on current account value = automatic compounding
- CAGR 20% → 6× in 10 years, 38× in 20 years
- CAGR 26% → 10× in 10 years, 100× in 20 years
- Quarterly compounding: 10%/quarter ≠ 40%/year → actually 46.4%/year
- Regular deposits accelerate compounding (₹50K/quarter adds significantly over 20 years)

## Alignment with Market Conditions

- Results are NOT consistent — accept negative weeks/months
- **Unfavorable conditions**: reduce IMS (intensity metrics), reduce trades, reduce RPT
- **Favorable conditions**: go aggressive, raise IMS, maximize gains
- Most traders fail by trading same intensity in all conditions
- Worse: they get MORE aggressive after losses (revenge trading) → magnified losses
- Money saved IS money made — protecting capital in bear markets = outperformance
