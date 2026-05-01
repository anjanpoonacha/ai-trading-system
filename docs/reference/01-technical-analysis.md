# Technical Analysis Reference

## Core Principles

**Price Discounts Everything**
- All information (news, expectations, fundamentals) reflected in price
- Analysis uses only price/volume patterns
- Excludes: company fundamentals, financials, valuation ratios, macroeconomics

**Trading Philosophy:**
- Trade any stock regardless of familiarity with business
- No concept of "cheap" or "expensive" — only "right prices" per setup
- All decisions governed by trading setup rules (never deviate)

---

## TradingView Platform Setup

### Chart Configuration

| Setting | Value |
|---------|-------|
| Theme | Dark |
| Bar style | **Holo Candles** |
| Scale | Logarithmic |
| Adjust for dividends | ✓ Enabled |
| Background | Black |
| Grid lines | None |

### Moving Average Ribbon

**Daily (1D):**
| Period | Type | Color | Opacity |
|--------|------|-------|---------|
| 10 | SMA | Orange | 70% |
| 20 | SMA | Green | 70% |
| 50 | SMA | White | 75% |
| 200 | SMA | Purple | 80-85% |

**Weekly (1W):** 50 SMA (White), 200 SMA (Purple) — both from Daily timeframe

**15-Minute (15m):** 50 SMA, 200 SMA — chart timeframe

### Champion Trader Volume + TRP Indicator

**Installation:**
1. Copy code from `CTC Resources > 1. TradingView Indicators > 4. Champion Trader Volume + TRP.txt`
2. Pine Editor → New Indicator → Paste → Save

**Display Values:**
| Position | Metric | Unit |
|----------|--------|------|
| 1st | Current bar volume | Shares (millions) |
| 2nd | 30-day avg volume | Shares (millions) |
| 3rd | Average turnover | Crores (India) / Millions (US) |
| 4th | Average TRP | % (daily volatility) |

**Settings:**
- India: Enable "Display in Crores" (✓)
- US: Disable (show millions)
- Also shows: Sector, Industry

---

## Chart Tools & Shortcuts

### Navigation

| Action | Shortcut | Result |
|--------|----------|--------|
| Change timeframe | `,` | Opens interval selector |
| Daily | `,` → `D` | 1D chart |
| Weekly | `,` → `W` | 1W chart |
| Monthly | `,` → `M` | 1M chart |
| 15-minute | `,` → `15` | 15m chart |
| Reset chart | `Alt + R` | Reset scale/position |
| Maximize panel | `Alt + Enter` | Expand current |
| Switch panels | `Tab` | Cycle layouts |

### Drawing Tools

**Horizontal Ray (Alt + J):**
- Mark support, resistance, entry, exit levels

**Trend-Based Fibonacci Extension:**
- Purpose: Calculate R-multiples (not Fibonacci analysis)
- Steps: Click entry → stop-loss → entry again
- Displays: Entry, -1R (stop), 2R, 3R, 5R, 7R, 15R

**Long Position Tool:**
- Inputs: Account size, risk %, entry, stop-loss, target
- Output: Position size (shares)
- Display: Compact stats mode

**Alerts:**
1. Click `+` at price level
2. Set trigger, notifications (app/email/popup), sound
3. Use for: stops, targets, entry signals

**Screenshots:**
- Download/Copy: Camera icon
- Share link: Copy Link (opens chart anywhere)

### Best Practices

- ✓ Use logarithmic scale (never manual adjust)
- ✓ Reset with `Alt + R` when needed
- ✓ Zoom in/out allowed
- ✓ Double-click drawing → Visibility → select timeframes
- ✓ Star tools to add to favorites
- ✗ Never manually adjust scale axes

---

## Chart Types

### Candlestick Chart (Primary)

**Structure:**
- **Body:** Open to Close (rectangle)
- **Wicks:** High/Low (lines)

**Color Logic:**
| Color | Meaning | Body Top | Body Bottom |
|-------|---------|----------|-------------|
| Green | Close > Open | Close | Open |
| Red | Close < Open | Open | Close |

**OHLC:**
| Point | Location |
|-------|----------|
| Open | Body edge (start) |
| High | Top wick |
| Low | Bottom wick |
| Close | Body edge (end) |

**Timeframe Context:**
- **Daily (1D):** 1 candle = 1 trading day (9:15 AM - 3:30 PM IST)
- **Weekly (1W):** Monday open → Friday close
- **Intraday (10m):** Each candle = 10 minutes

---

## Layout Configuration

**Three-Panel Setup:**
| Panel | Timeframe | Purpose |
|-------|-----------|---------|
| 1 | Daily (1D) | Primary analysis |
| 2 | 15-min (15m) | Intraday entry timing |
| 3 | Weekly (1W) | Trend context |

**Navigation:** Click panel to focus, `Alt + Enter` maximize, `Tab` cycle, click point to sync across timeframes

---

## Order Types

### Limit Order
- Execute ONLY at specified price or better
- Risk: May never fill
- Use: Precise price control

**Workflow:** Buy → Quantity → Limit → Enter price → Submit

### Market Order
- Execute immediately at best available price
- Risk: No price control (slippage in fast markets)
- Use: Immediate execution priority

**Logic:**
- Buy market → matches lowest ask
- Sell market → matches highest bid
- Does NOT appear in market depth (instant execution)

### Market Depth Terminology

| Term | Definition |
|------|------------|
| **LTP** | Last Traded Price |
| **Bid** | Buy orders (left side) |
| **Ask/Offer** | Sell orders (right side) |
| **Market Depth** | Real-time best orders + quantities |
| **Volume** | Total shares traded today |
| **Circuit Limits** | Max/min price allowed (India) |

**Price Movement:**
- Rising → Demand > Supply (aggressive buyers)
- Falling → Supply > Demand (aggressive sellers)

---

## Support and Resistance

### Identification Rules
1. Look left for significant tops (resistance) and bottoms (support)
2. Mark ONLY clearly visible levels (if searching hard, skip it)
3. Connect candle bodies (ignore wicks)
4. 2+ rejections from same level = stronger S/R
5. Use horizontal ray (Alt+J)
6. Keep chart clean — mark only major levels near current price

### Why They Work
- **Market memory:** Participants remember previous reversals
- Resistance → excessive supply (selling pressure)
- Support → excessive demand (buying pressure)
- Price tends to reverse at remembered levels

### Guidelines
- S/R are ZONES, not exact prices
- Weekly charts preferred for major levels
- Focus on levels near current price
- One line per zone
- **Rule:** Only horizontal lines can be support/resistance (dynamic levels like MAs cannot)

---

## Pivotal Candles

### Definition
Candles with significant activity that may be decisive for price movement.

### Identification Criteria

| Factor | Measurement | Threshold |
|--------|-------------|-----------|
| **True Range** | High - Low + gap from previous close | Above 50-period average |
| **Volume** | Number of shares traded | Above 50-period average |

**True Range Components:**
1. Size of current candle (high - low)
2. Distance moved from previous close

**Rule:** A candle is pivotal if EITHER true range OR volume exceeds average (preferably both).

### Analysis Method

**Determine candle sentiment:**
- **Positive Pivotal:** Close in upper half of candle's range (above midpoint) → Bulls dominated
- **Negative Pivotal:** Close in lower half of candle's range (below midpoint) → Bears dominated

**Midpoint calculation:** (High + Low) / 2

---

## Breakouts

### Definition
Stock decisively breaks above resistance level.

### Confirmation Criteria

| Feature | Requirement |
|---------|-------------|
| Candle Type | Positive pivotal candle |
| Close Position | Above resistance zone |
| Volume | Above average |
| Range | Above average |

**Logic:** Buyers absorbed all selling pressure and pushed price through ceiling → bullish sentiment.

---

## Breakdowns

### Definition
Stock decisively breaks below support level.

### Confirmation Criteria

| Feature | Requirement |
|---------|-------------|
| Candle Type | Negative pivotal candle |
| Close Position | Below support zone |
| Volume | Above average |
| Range | Above average |

**Logic:** Sellers overwhelmed buyers at support, lack of demand pushed price through floor → bearish sentiment.

---

## Moving Averages

### Settings

| Indicator | Period | Color | Opacity | Timeframe |
|-----------|--------|-------|---------|-----------|
| MA 1 | 50 days | White | 75% | 1 Day |
| MA 2 | 200 days | Purple | 80% | 1 Day |

**Critical:** Always set timeframe to "1 Day" regardless of chart timeframe (daily/weekly).

### Purpose
- Quickly analyze trend/stage
- Assess price extension
- **NOT** for support/resistance (dynamic levels cannot act as S/R)

---

## Chart Patterns

### General Rules
1. Pattern must be clearly visible — never force a pattern
2. Requires minimum 2 touches/reversals per line
3. Breakout/breakdown confirms pattern
4. Nothing works 100% — use in confluence with other factors
5. **Pattern contraction logic:** When price squeezes (range contracts), expansion typically follows

### Bullish Patterns

| Pattern | Structure | Confirmation |
|---------|-----------|--------------|
| **Ascending Triangle** | Horizontal resistance + rising support (higher lows) | Breakout above resistance |
| **Double Bottom** | Two rejections of same support (W-shape) | Breakout above neckline |
| **Triple Bottom** | Three rejections of same support | Breakout above neckline |
| **Rounding Bottom** | Curved bottom (U-shape) after downtrend | Breakout above neckline |
| **Cup and Handle** | Rounding bottom + small pullback (handle) | Breakout above handle resistance |
| **Inverse H&S** | Left shoulder + deeper head + right shoulder | Breakout above neckline |

### Bearish Patterns

| Pattern | Structure | Confirmation |
|---------|-----------|--------------|
| **Descending Triangle** | Horizontal support + declining resistance (lower highs) | Breakdown below support |
| **Double Top** | Two rejections of same resistance (M-shape) | Breakdown below neckline |
| **Triple Top** | Three rejections of same resistance | Breakdown below neckline |
| **Rounding Top** | Curved top (inverted U-shape) | Breakdown below neckline |
| **Head and Shoulders** | Left shoulder + higher head + right shoulder | Breakdown below neckline |

### Neutral Patterns

| Pattern | Structure | Outcome |
|---------|-----------|---------|
| **Symmetrical Triangle** | Lower highs + higher lows converging | Breakout (up) or breakdown (down) |

---

## Critical Philosophy

**Primary Goal:** Interpret price action behavior, NOT name patterns correctly.

**Why Learn Patterns:**
1. Foundational knowledge in technical analysis
2. Practice connecting highs/lows and drawing lines
3. Build chart familiarity

**Key Principles:**
- Patterns are subjective — same formation can be named differently
- No "correct" pattern identification
- Focus on what price/volume reveals, not pattern names
- Patterns are training tools, not trading rules
- **Rule:** Price action interpretation > Pattern naming

**Critical Warning:** DO NOT waste time memorizing candlestick patterns (doji, hammer, engulfing, etc.) — patterns appear "magical" but are unreliable. This course teaches logical interpretation instead.

---

## Key Definitions

| Term | Definition |
|------|------------|
| **R-Multiple** | Risk/reward ratio (3R = profit target is 3× risk) |
| **TRP** | True Range Percentage; avg daily volatility (2.84% = ~2.84% daily move) |
| **Turnover** | Total value traded (price × volume) |
| **Volume MA** | 30-day average shares traded per period |
| **Trading Setup** | Complete rule set for all trade decisions |
| **Holo Candles** | Hollow (bullish), filled (bearish) |
| **Pivotal Candle** | Candle with above-average range OR volume |
| **Neckline** | Resistance/support line connecting pattern peaks/valleys |

---

**Character count: 10,847**