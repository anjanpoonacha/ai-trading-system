# Risk Management

## Core Principles

1. **Risk management is more critical than analysis**
   - Poor analyst + great risk manager = may survive
   - Great analyst + poor risk manager = will not survive long

2. **Losses are inevitable**
   - Trading involves probabilities, not certainties
   - Can be profitable with only 40% winning trades
   - Must embrace losses as part of the game
   - Only controllable factor: restrict the amount of losses

3. **Always think risk first, reward second**

## Stop Loss

**Definition**: A defined price level below which you do not hold the stock.

**Rule**: Never take a trade without a stop loss.

- Signifies you are wrong in the trade or risk is unjustified
- By defining stop loss in advance, losses can be restricted
- Most traders fail because they never know when to exit losing trades

## Risk Per Trade (RPT)

**Definition**: Maximum loss you are ready to bear in a losing trade, expressed as percentage of account value.

**Guidelines**:
- For most traders: 0.5% to 1% of account value is comfortable
- Average target: 0.5% to 1% RPT
- Depends on:
  - Trader's risk appetite (conservative/moderate/aggressive)
  - Trading style (scalper/intraday/swing/positional)
  - Market conditions

**Rule**: Always determine RPT percentage before taking a trade.

### Importance of Low RPT

| Scenario | Jim (1% RPT) | Tom (5% RPT) |
|----------|--------------|--------------|
| Starting capital | ₹5,00,000 | ₹5,00,000 |
| Loss per losing trade | ₹5,000 | ₹25,000 |
| After 10 consecutive losses | ₹4,50,000 (-10%) | ₹2,50,000 (-50%) |
| Return needed to recover | 11.1% | 100% |

**Key insight**: The bigger the drawdown, the more difficult it becomes to recover.

## Position Sizing

**Formula**:
```
Position Size % = (Desired RPT %) / (Stop Loss %) × 100
```

**Calculation Steps**:
1. Determine RPT % for the trade
2. Calculate Stop Loss % = (Entry Price - Stop Loss) / Entry Price × 100
3. Calculate Position Size % using formula
4. Position Size (₹) = Account Value × Position Size %
5. Quantity = Position Size (₹) / Entry Price

**Example**:
- Account Value: ₹1,00,000
- RPT: 1%
- Entry: ₹100, Stop Loss: ₹92 (8% SL)
- Position Size % = 1% / 8% × 100 = 12.5%
- Position Size = ₹1,00,000 × 12.5% = ₹12,500
- Quantity = ₹12,500 / ₹100 = 125 shares
- Loss if SL hit = 125 × ₹8 = ₹1,000 (1% of account)

## Key Definitions

### Capital Deployed
**First year**: Net funds added to broker account (deposits - withdrawals)

**Subsequent years**: Account Value as on 1st Jan + deposits - withdrawals

### Account Value
```
Account Value = Capital Deployed + Realized Gain/Loss (from 1st Jan) + Unrealized Gain/Loss
```

**For trading purposes** (simplified):
```
Account Value = Capital Deployed + Realized Gain/Loss (from 1st Jan)
```
*Ignore unrealized gain/loss for easy calculations*

**Critical Rule**: Position sizing and RPT calculations must be done on Account Value, not Capital Deployed, to enable compounding.

### Exposure

| Type | Formula |
|------|---------|
| Long Exposure | (Cost Price × Quantity of all long trades) / Account Value |
| Short Exposure | (Cost Price × Quantity of all short trades) / Account Value |
| Total Exposure | Long Exposure + Short Exposure |
| Net Exposure | Long Exposure - Short Exposure |

### Free Cash, Margin, and Leverage

- **Free Cash**: Cash balance available for trading
- **Margin**: Non-cash balance available for trading (broker loan or pledged stocks)
- **Leverage**: Ability to buy more than free cash amount
  - When Total Exposure > Account Value, implies taking leverage
  - Generally implies using margin

## Return on Investment (ROI)

**Definition**: Percentage gain on capital deployed over a year (yearly metric).

### Calculation Methods

**1. No subsequent deposits/withdrawals**:
```
ROI % = Net Profit / Capital Deployed × 100
```

**2. With subsequent deposits/withdrawals**:

*Method A (Simple)*:
```
ROI % = Net Profit / Average Capital Deployed × 100
```
Calculate weighted average capital deployed for the period.

*Method B (Precise)*:
1. Calculate ROI % for each exited trade:
   ```
   Trade ROI % = Realized Profit / Capital Deployed (on trade open date) × 100
   ```
2. Sum all individual trade ROI percentages for the period

## Futures Trading

**Advantages**:
1. Significantly lower STT (Securities Transaction Tax) vs stocks
2. Built-in leverage (15-25% margin required)
3. No interest charged by broker

**Rule**: Trade futures only if position sizing allows at least 3 lots per trade
- Reason: Exits are done in installments
- Lot sizes vary by stock

## Risk Reward Ratio (R Multiple)

**At Trade Level**:
```
R Multiple = (Target - Entry) / (Entry - Stop Loss)
```

**Examples**:

| Entry | Stop Loss | Target | Gap to Target | Gap to SL | R Multiple |
|-------|-----------|--------|---------------|-----------|------------|
| 100 | 95 | 105 | 5 | 5 | 1R |
| 200 | 185 | 230 | 30 | 15 | 2R |
| 500 | 480 | 510 | 10 | 20 | 0.5R |

**Rule**: Higher the R multiple, better it is (risked less to gain more).

## Average Risk Reward Ratio (ARR)

**At Summarized Level** (over a period):
```
ARR = Average Gain per Trade / Average Loss per Trade
```

**Calculations**:
- Average Loss = Total Losses / Number of Losing Trades
- Average Gain = Total Profits / Number of Winning Trades

**Rule**: Keeping other metrics constant, higher ARR is better.

**Example**: If Average Gain = ₹10,000 and Average Loss = ₹5,000, then ARR = 2

## Win Rate (WR)

**Definition**: Percentage showing relationship between winning and losing trades.

```
Win Rate % = (Number of Winning Trades / Total Number of Trades) × 100
```

**Example**: 63 winning trades out of 140 total = 45% win rate

**Rule**: Higher win rate is better (keeping other metrics constant).

## Expectancy Metrics (EMs)

**Components**: ARR + Win Rate

**Purpose**: Determine if trading with positive or negative expectancy
- Positive expectancy = profitable trading
- Negative expectancy = loss-making

### Break-Even Combinations

| ARR | Minimum Win Rate for Break-Even |
|-----|--------------------------------|
| 0.5 | 66.6% |
| 1.0 | 50.0% |
| 2.0 | 33.3% |
| 3.0 | 25.0% |

**Key Insights**:
- As ARR increases, required win rate for break-even decreases
- Achieving higher R multiples is difficult (target further away = lower probability)
- Strategy targets: ARR ≥ 2, Win Rate ≥ 40%

### Strategy Targets

- **Minimum ARR**: 2 (or above)
- **Minimum Win Rate**: 40% (or above)
- At ARR = 2 and WR = 40%: Creates positive expectancy (~24% return at 120 trades, 1% RPT)

## Intensity Metrics (IMs)

**Components**:
1. Number of Trades
2. RPT Percentage

**Function**: Decide how extreme results will be (profits or losses)

**Rules**:
- **In positive expectancy**: Higher IMs = higher profits
- **In negative expectancy**: Higher IMs = higher losses

**Number of Trades depends on**:
- Trading setup and timeframe
- Market conditions (critical factor)

**RPT % depends on**:
- Risk appetite
- Market conditions

**Guidelines**:
- RPT range: 0.75% to 1.5% for most traders
- Number of trades: 100-200 per year (for this strategy)

## Market Conditions and Alignment

**Critical Concept**: Results are affected by market conditions, not just skills.

**Common Mistake**: Most traders trade with same intensity in all market conditions
- Make money in bull markets
- Give back all gains (and more) in bear markets
- Do not align with market conditions

**Rules**:
1. **Unfavorable conditions**: EMs will be lower
   - Reduce IMs (fewer trades, lower RPT)
   - Prevents maximizing losses
   
2. **Favorable conditions**: EMs will be higher
   - Increase IMs (more trades, higher RPT)
   - Maximizes gains

3. **Regular income not possible**: Accept negative returns in some periods

## Open Risk (OR)

**Definition**: Percentage of account value at risk (more important than exposure for traders).

### Total Open Risk (TOR)

```
TOR = Sum of all individual trade open risks
TOR % = TOR (₹) / Account Value × 100
```

### Open Risk per Trade

**Formula**:
```
Open Risk = Open Quantity × (Entry Price - Current Stop Loss)
```

**Special Cases**:
- Stop loss raised to cost: OR = 0
- Stop loss raised above cost: OR = negative (reduces TOR)

**Rule**: Monitor TOR % every day.

## Open Risk (OR) Metrics

**Purpose**: TOR represents intensity metrics, should be adjusted per market conditions.

### OR Matrix (Moderate Risk Appetite)

| Market Stance | Maximum Open Risk (MOR) |
|---------------|------------------------|
| Very Strong | 5% |
| Strong | 4% |
| Moderate | 2% |
| Weak | 1% |

### OR Matrix (Conservative Risk Appetite)

| Market Stance | Maximum Open Risk (MOR) |
|---------------|------------------------|
| Very Strong | 4% |
| Strong | 3% |
| Moderate | 1.5% |
| Weak | 0.75% |

### OR Matrix (Aggressive Risk Appetite)

| Market Stance | Maximum Open Risk (MOR) |
|---------------|------------------------|
| Very Strong | 6% |
| Strong | 5% |
| Moderate | 3% |
| Weak | 1.5% |

**Rules**:
1. Classify market into stance at any given time
2. Keep TOR within MOR according to OR matrix
3. OR matrix answers:
   - Should you take new trade(s)?
   - If yes, what should be RPT % in that trade?

**Example**: Market stance = Strong, TOR = 2%
- MOR = 4%, so can take new trades
- RPT for new trade = 1%

**Guidance**: Start with moderate, adjust based on comfort level.

## Compounding

**Key Principle**: No special effort needed — built into risk management rules.

**Mechanism**: RPT calculated on Account Value (not initial capital)
- As capital grows, position sizes automatically increase
- Enables compounding effect

### Compounding Examples

**Annual Compounding**:

| CAGR | 10 Years | 20 Years |
|------|----------|----------|
| 20% | 6x | 38x |
| 26% | 10x | 100x |

**Quarterly Compounding** (10% per quarter):
- Simple calculation: 40% per year
- With compounding: 46.41% per year

**Monthly Compounding** (3% per month):
- Simple calculation: 36% per year
- With compounding: 42.58% per year

### Quarterly Return to Annual ROI

| Quarterly Return | Annual ROI (without compounding) | Annual ROI (with compounding) |
|-----------------|----------------------------------|------------------------------|
| 6% | 24% | 26% |
| 22% | 88% | 122% |

**Note**: Higher initial investment + regular deposits = faster compounding effect.

## Risk Management Rules Summary

1. **Always determine stop loss for each trade**
2. **Exit trade if it violates stop loss** (respect the plan)
3. **Respect OR metrics**:
   - Take new trades and decide RPT using OR metrics
   - Keep TOR within MOR
4. **Always calculate position size with formula**:
   ```
   Position Size % = (RPT %) / (Stop Loss %) × 100
   ```
5. **Maximize expectancy metrics**:
   - Take only high probability trades (maximize win rate)
   - Achieve high R multiples (maximize ARR through effective exits)

## Performance Targets

### Minimum Metrics

| Metric | Target |
|--------|--------|
| ARR | ≥ 3 |
| Win Rate | ≥ 35% |
| Trades per Year | 120-350 |
| Average RPT | 0.5-1% |

**With minimum metrics** (ARR=3, WR=35%, 120 trades/year, RPT=0.5%):
- Quarterly return: ~7%
- Annual ROI (with compounding): ~31%

### Performance Scaling Examples

| RPT | ARR | Trades/Quarter | Win Rate | Annual ROI |
|-----|-----|----------------|----------|------------|
| 0.5% | 3.0 | 30 | 35% | 31% |
| 0.5% | 3.0 | 40 | 35% | 36% |
| 0.5% | 3.0 | 40 | 40% | 57% |
| 0.75% | 3.0 | 40 | 40% | 94% |
| 0.75% | 3.5 | 40 | 40% | 136% |
| 0.9% | 4.0 | 45 | 45% | 460% |

### ARR vs Win Rate Impact

**Comparison** (40 trades/quarter, 0.75% RPT):

| Trader | ARR | Win Rate | Annual ROI |
|--------|-----|----------|------------|
| A | 1.0 | 50% | 0% (break-even) |
| A | 1.0 | 60% | 26% |
| B | 3.0 | 25% | 0% (break-even) |
| B | 3.0 | 30% | 26% |
| B | 3.0 | 35% | 57% |

**Key Insight**: High ARR is game-changing
- Small win rate increase with high ARR = big impact
- Raising win rate above 70-80% is very difficult
- Focus on maximizing R multiples in trades