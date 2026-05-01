# Technical Analysis

## Approach
Technical analysis is the study of price and volume behavior over time. Price discounts everything — all information, news, expectations are reflected in price. The goal is to interpret price action behavior, not to name patterns or predict fundamentals.

## Indicators Used
- **50 SMA** — white, 75% opacity, timeframe: 1D
- **200 SMA** — purple, 80-85% opacity, timeframe: 1D
- **10 SMA** — orange, 70% opacity, timeframe: 1D (daily chart only)
- **20 SMA** — green, reduced opacity, timeframe: 1D (daily chart only)
- **True Range** — identifies pivotal candles; compare bar vs 50-candle average
- **Volume** — compare bar vs 50-candle average volume
- **Champion Trader Volume+TRP indicator** (custom Pine Script) — displays:
  - Current volume
  - 30-day average volume
  - Average turnover (₹ crores for India, millions for US)
  - TRP (average daily % range/volatility)
  - Sector & industry classification

## Candle/Bar Settings
- **Chart type:** Hollow Candles (not regular candlesticks)
- **Timeframes used:** Daily (primary), Weekly, 15-minute
- **Scale:** Logarithmic (always enabled)
- **Dividends:** "Adjust data for dividends" ticked

## Weekly Chart Indicators
- 50 SMA (white) + 200 SMA (purple) only — timeframe locked to 1D

## 15-Minute Chart Indicators
- 50 SMA + 200 SMA only — timeframe locked to 1D

## Key Concepts

### Support & Resistance
- Horizontal zones only (never dynamic/moving averages)
- Identify significant, clearly visible tops (resistance) and bottoms (support) on weekly chart
- Connect bodies of candles (not wicks) for clean lines
- More reversals from a level = stronger zone
- Only mark zones that are immediately obvious — if you have to look hard, it's not significant
- These zones act as future barriers due to market memory

### Pivotal Candles
- A candle is pivotal when BOTH conditions met:
  1. True range > 50-candle average range
  2. Volume > 50-candle average volume
- **Positive pivotal candle:** close is in upper half of candle's own range (high-low)
- **Negative pivotal candle:** close is in lower half of candle's own range
- Only pivotal candles deserve analysis — ignore small/average candles

### Breakout
- Stock breaks resistance decisively
- Confirmed by: (1) positive pivotal candle + (2) close above resistance
- Bullish price action

### Breakdown
- Stock breaks support decisively
- Confirmed by: (1) negative pivotal candle + (2) close below support
- Bearish price action

### Chart Patterns (for awareness, not primary method)
**Bullish:** double bottom, triple bottom, rounding bottom, cup & handle, inverse H&S
**Bearish:** double top, triple top, rounding top, head & shoulders
**Both:** ascending triangle, descending triangle, symmetrical triangle

- Never force a pattern onto a chart — only valid if clearly/easily visible
- Patterns are subjective — same formation can be named differently
- Focus on interpreting price behavior, not naming patterns
- Breakout/breakdown of pattern neckline = signal

### Moving Averages — Usage Rules
- Do NOT use MAs as support/resistance (they are dynamic, only horizontal levels are S/R)
- Use MAs to quickly assess trend/stage and how extended the stock is

### Candlestick Patterns
- Explicitly NOT used in this system
- Do not study or memorize traditional candlestick patterns (hammer, doji, engulfing, etc.)

## Tools & Platform Setup

### TradingView Settings
- **Theme:** Dark
- **Background:** Black
- **Grid lines:** None
- **Layout:** 3-panel (Daily | 15-min | Weekly)
- **Keyboard shortcuts:**
  - Alt+Enter: maximize panel
  - Tab: cycle between panels
  - Comma: change timeframe dialog
  - Alt+R: reset chart
  - Alt+J: horizontal ray tool
- **Scale:** Never manually adjust axes — only zoom in/out, use Alt+R to reset

### Drawing Tools (favorites)
- Horizontal Ray (Alt+J) — for S/R levels
- Trend-based Fib Extension — for R-multiple targets (not Fibonacci analysis)
  - Levels: 2R, 3R, 5R, 7R, 15R
- Long Position tool (Forecasting & Measurement) — inputs: account size, risk %, entry, stop-loss, profit target → outputs quantity to buy

### Alerts
- Set at key price levels (support, resistance, stop-loss, targets)
- Notifications: app + popup + email

### Screenshots & Journal
- Camera button → Copy Link → paste link in trading journal

## Order Types
- **Limit order:** buy/sell at specific price; may not fill
- **Market order:** instant fill at best available price
- Always use NSE (more liquid than BSE for Indian markets)
- Always select "Longterm" (not intraday) — holding period is days/weeks minimum
