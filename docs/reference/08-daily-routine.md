# Daily Routine - Reference Document

## Core Objectives
- **Clarity in Action**: Specific tasks at specific times, no randomness
- **Time Optimization**: Minimize screen time during market hours
- **Organization**: Structured watch lists, scanners, and tracking systems
- **Stay Updated**: Continuous awareness of market/sector conditions
- **Performance Evaluation**: Regular review and improvement cycles
- **Continuous Learning**: Systematic historical chart analysis

---

## Market Hours Routine

### Market Open (5-20 minutes)
- Glance through charts of **open positions only** (not P&L in broker app)
- Use TradingView charts, not trading platform
- If alert triggered in first 10-20 minutes: monitor and take action if needed
- Open trading app **only** to execute orders

### During Market Hours
- **Strictly avoid** opening TradingView or trading app unless alert triggered
- When entering new position: **immediately** place stop loss alert/order
- Do NOT monitor P&L or watch price fluctuations

**For Live Traders:**
- Be active when entry alerts trigger
- Take entries appropriately

**For All Traders:**
- Be active when exit alerts trigger (stop loss or mathematical targets: 3R, 4R)
- Manage trades appropriately

### Last Hour Before Close (initially 1 hour, reduces to 10-15 minutes)
1. Evaluate open positions for exits → execute if needed
2. Calculate total open risk
3. Plan entries from Ready section or Setup Scan
4. Execute entries
5. **Immediately** set alerts near initial/revised stop loss and mathematical targets (3R, 4R)
6. Complete partial entries if sustained above trigger

### Critical Rules
**Only open TradingView when:**
1. Market open routine
2. Alert triggered during market hours
3. Market close routine

**Only open trading app to:**
- Place orders/trades
- Check order status

---

## Post-Market Routine (20-30 minutes average)

### Mandatory Activities (in order)
1. **Record trades in journal** (if any transactions occurred)
   - Upload chart screenshots
   - Add comments
2. **Run scanners**: Short List, PPC, NPC
3. **Update watch lists**: Short List (Ready/Near/Away), Setups, Open Positions, Closed Positions
4. **Set alerts** for entries and exits
5. **Update Setup Tracker Sheet**
6. **Update diary** with observations, emotions, insights

### Time Requirements
- Good market conditions: ~30 minutes
- Poor market conditions: 5-10 minutes
- Beginners: may take up to 1 hour initially
- Experienced traders: 20-30 minutes

**Non-negotiable activities** (if extremely busy):
- Record trades
- Run scanners
- Update watch lists
- Set alerts

---

## Weekend Routine (Saturday/Sunday)

1. **Performance evaluation** using trade journal
   - Review past week, month, quarter
   - Study metrics
2. **Analyze failures and successes**
   - Review journal trades
   - Review Setup Tracker Sheet
   - Identify repetitive mistakes and strengths
3. **Review Short List** to gauge market and stocks
4. **Analyze historical charts**
   - Run Big Mover Scanner (for a year or quarter)
   - Study charts on TradingView
   - Mark entries and exits
   - Use **Bar Replay** function to simulate live market bar-by-bar
   - The more time spent, the better

---

## Trading Journal (championjournal.com)

### Required Inputs
- Stock name, entry date, quantity, entry price
- Stop loss level
- Exit date, quantity, exit price
- Charges and brokerage costs
- **Chart screenshots** at entry and each exit
- Analysis writeup for the setup
- Daily diary notes
- Deposits and withdrawals

### Metrics Calculated

**Trade-Level Metrics:**
- RPT (Risk Per Trade)
- R multiple
- Stop loss %
- Position size %
- Gain %
- Return on capital deployed
- Account gain %
- Days held

**Overall Metrics (by period):**
- Average R multiple
- Average risk-reward ratio
- Win rate
- Number of trades
- Average RPT per trade
- Equity curve
- R distribution

### Critical Rule
> "If you do not maintain your trading journal, you will not succeed in the long term."

---

## Watch Lists Structure (TradingView)

### 1. Short List
**Contents:** Great stocks building great bases or potential setups (Stage 1B or Stage 2)
**Source:** Short List Scan (run daily post-market)

**Sections:**
- **Away**: Stock needs time (just started base, waiting for wake-up call)
- **Near**: Stock nearing end of base, awaiting trigger bar (wake-up call given, waiting for pullback)
- **Ready**: Stock has trigger bar, ready for entry (waiting for trigger bar high to break)

**Workflow:**
```
Away → (wake-up call) → Near → (trigger bar forms) → Ready → (100% entry triggered) → Setups
```

**Removal Conditions:**
- Stock fully triggered → move to Setups
- Stock turns completely weak (base destroyed, breakdown, ultimate weakness) → remove entirely

### 2. Setups
**Contents:** All trades that are **fully triggered** (100% entry, not just 50%)

**Sources:**
- Short List (when 100% triggered)
- Setup Scan (last hour) — direct entry without passing through Short List

**Includes:**
- Trades you took
- Trades you did not take (but were triggered)

**Removal Conditions:**
- Stock shows **ultimate weakness** → remove
- Setup triggered but hit stop loss within a few days → keep 5-10 more days, then remove

### 3. Open Positions
**Contents:** Stocks you are currently holding (trades you took)
**Transfer:** When 100% exited → move to Closed Positions

### 4. Closed Positions
**Contents:** Fully exited trades
**Retention:** Keep for **3 months** for post-trade analysis
**Removal:** After 2-3 months, remove from watchlist

---

## Alert Management

### Setting Alerts (TradingView)
- Click + button at price level → Add Alert
- Or click on drawn line → + button → Add Alert
- Set expiry as needed
- View all alerts: click alert icon (top right)

### Alert Requirements
- **Stop loss alert**: immediately after entry
- **Trailing stop alerts**: update daily as needed (PPC at extension, low of day, etc.)
- **Entry alerts**: for all stocks in Ready list
- **Break-even alert**: when trailing to cost, set alert above entry price
- **Mathematical target alerts**: 3R, 4R

---

## Scanners

### Platform: Marketinout.com
- **Discount:** 20% off with coupon code **CHAMPS**
- **Recommendation:** 2-year membership (40% discount + 20% coupon = 60% total savings)
- **Global coverage:** India, US, China, and more
- **Backdated scans:** Run scans on historical dates using `ADHIST(MM,DD,YYYY)` command
- **Time savings:** 90%+ reduction in screen time and effort

### Daily Scans (Mandatory)

**1. Setup Scan (Last Hour of Market)**
**Filters:**
- Liquid stocks
- Positive candle (closed above previous close OR in upper half of range)
- Not very weak
- Not very extended

**Purpose:** Identify setups for **close entry**
**Process:** Run scan → analyze charts → look for entries

---

**2. Short List Scan (Post-Market Daily)**
**Filters:**
- Liquid stocks
- **Contracted candle** (on previous or current day)
- Not very weak
- Not very extended

**Liquidity Definition:**
- India: 20 crores average turnover (customize based on position size)
- US: Customize based on position size
- Formula: `Average Volume × Price`

**Purpose:** Find healthy stocks forming healthy bases
**Process:** Run scan → look for Stage 1B or Stage 2 structures → add to TradingView Short List

---

**3. PPC Scan (Positive Pivotal Candle) - Post-Market Daily**
**Filters:**
- Top 200 liquid stocks only
- Producing PPC on given day

**Purpose:** Stay up to date with big stocks, observe market behavior
**Process:** Run scan → observe results → record observations in Setup Tracker Sheet

---

**4. NPC Scan (Negative Pivotal Candle) - Post-Market Daily**
**Filters:**
- Top 200 liquid stocks only
- Producing NPC on given day

**Purpose:** Identify flush patterns, track weakening sectors/stocks
**Process:** Run scan → observe results → record observations in Setup Tracker Sheet

**Example Observations:**
- Many stocks produced NPC today (negative sign)
- Multiple stocks from same industry showing PPCs
- No observation needed on some days

---

### Scanner Setup (Marketinout)

**Chart Templates:**
Create 3 templates: **Daily**, **Weekly**, **Monthly**
- Add moving averages: 20, 50, 200
- Consistent settings across all templates

**Steps:**
1. Click **Stock Chart** → **My Chart Templates** → **New Chart Template**
2. Name it (Daily/Weekly/Monthly)
3. Add MAs: 20, 50, 200
4. Save template
5. Repeat for all 3 timeframes

**Creating Scanners:**
1. Go to **Stock Screener** → **Formula Screener**
2. Copy scanner conditions from course resources folder (Google Drive → Scanners folder)
3. Paste conditions into Formula Screener
4. Name the scanner (use names from resources folder)
5. Click **Save Screen** or **Run Screen**

**Using Scanners:**
- Access saved scanners: **My Stock Screen**
- **Always sort by Sector** (then by Industry within sector)
- View columns: Symbol, Sector, Industry, Exchange, Market Cap, Last Price, Change %, Volume
- Click **Charts** for ready-made charts
- Adjust chart size: Small/Medium/Big/Huge
- Adjust zoom: 2x to 1:1 (recommended range)
- Toggle timeframes: Daily/Weekly/Monthly templates

---

## Trading Diary

### Purpose
- Document thoughts, emotions, observations, insights
- Personal growth and emotional management tool
- Strategic learning record
- **Do NOT share with anyone or view others' diaries**

### Daily Entry Format
```
Date: [date]
Open Positions: [number]
Exposure: [%]
TOR: [%]

Notes:
- Market/sector observations
- Actions taken (buy/sell/none)
- Emotions during/post market
- What went right/wrong
- Mistakes and lessons
- Performance review notes (monthly)
```

### Guidelines
- Write freely, no overthinking
- No standard structure required
- May be few lines or few paragraphs
- Develops naturally over time
- Record scanner insights
- Note sector/industry performance
- Track psychological state

---

## Chart Book (Playbook)

### Purpose
Personal database of great setups for reference when evaluating new trades

### Collections to Maintain
1. **Great Setups**: high-quality setups found over time
2. **Missed Trades**: setups not taken
3. **Test New Concepts**: experimental strategies/patterns

### Required Information
- Entry date
- Chart at entry
- Exit date
- Chart at exit
- Percentage move

### Rules
- Maintain in championjournal.com
- **Do NOT share or view others' chart books** (personal tool)
- Build over many years
- Develops chart memory
- Enables pattern discovery

---

## Market Stance Determination

### Primary Indices
- **Indian Market**: Nifty 500
- **US Market**: S&P 500

*Alternative indices available (Nifty 50, small cap, mid cap) but fix on one for consistency.*

### Moving Average Setup
- **Indicators**: 10 SMA and 20 SMA
- **Timeframes**: Daily and Weekly charts
- **Weekly equivalents**: 
  - 50-day = 10-week
  - 100-day = 20-week
  - 200-day = 40-week

### Strong Market Conditions (Best Trading Environment)
All three conditions must be met:
1. Price floats above both 10 SMA and 20 SMA
2. 10 SMA floats above 20 SMA
3. Both moving averages sloping upward

*This environment produces: easy trades, high risk-reward, high win rate.*

### Weak Market Signals

| Signal Type | Conditions | Action Required |
|-------------|-----------|-----------------|
| **Weak Signal 1** | Price breaks and closes below both 10 and 20 SMA, sustains there | Reduce intensity |
| **Weak Signal 2** | 10 SMA crosses below 20 SMA AND price breaks below recent support | Reduce intensity |
| **Weak Signal 3** | Both 10 and 20 SMA sloping downward | Stop trading / very conservative |

### Analysis Approach
- **Primary focus**: Daily chart (provides early signals for swing/positional trading)
- **Secondary**: Weekly chart (broader picture)
- **Key principle**: Place more weight on daily timeframe for swing trading

### Transition Periods (Critical)
- **Most dangerous period**: When market shifts from strong to weak
- **Why dangerous**: Traders remain aggressive from prior strong conditions
- **Result**: Large drawdowns if intensity not adjusted immediately
- **Required action**: Reduce intensity immediately when weak signals appear

### Trading During Weak Markets
- **Downtrend with both MAs sloping down**: No trading
- **Small upswing with MAs starting to slope up**: Attempt few trades cautiously
- **Immediate reversal back down**: Exit market immediately
- **Cannot predict bottoms**: Only respond to what charts show

### Building Positions in New Uptrend
- **Goal**: Get most aggressive at START of confirmed upswing
- **Why**: Only way to capture full move and achieve high R-multiples
- **Confirmation signals**:
  - Price starts sloping up
  - Moving averages start sloping up
  - Price bouncing well off support

### Support/Resistance Marking
- Use previous swing lows as support levels
- Mark these to determine when breakdown occurs
- Breakdown of support + MA crossover = clear weak signal

### Key Factors for Market Stance

**1. Index Analysis** (as above)

**2. Your Trades**
- Recent trade failures indicate weak market
- Scale up intensity when trades succeed
- Scale down intensity when trades fail
- OR matrix automates this scaling

**Example scenario:**
- Maximum allowed TOR: 3%
- Three trades taken: 1% risk each = 3% TOR
- All three hit 2R targets
- Stop loss revised to cost → TOR becomes 0%
- **Result**: Permission to take 3% more risk (new trades)

**How it works:**
- Favorable conditions + working trades = more permissions to trade
- Unfavorable conditions + struggling trades = fewer/no permissions to trade
- System automatically enforces scaling up/down

**3. Watch List (Most Leading Indicator)**
Observe:
- Number of stocks added/removed recently
- Quantity of good setups forming
- Industry concentration in Near/Ready lists
- Topping structures forming
- Relative comparison over weeks/months

**Watch List Signals:**
- Many stocks added = strong market
- Many choices/good setups = aggressive trading
- Topping structures/broken bases = market may fall
- Stocks breaking out in weak index = potential reversal
- Most stocks extended = wait for pullback even in bull market
- Many pullbacks/contractions after extension = good entry timing

### Critical Principle
> "Pay the most respect to market conditions. Do not fight the market — align with it."

- Favorable conditions: trade aggressively
- Unfavorable conditions: reduce intensity or stop trading
- May have weeks/months with no trades
- Few favorable months can produce year's worth of gains
- Contain losses and minimize drawdowns in weak markets

**In poor market conditions:**
- Majority of stocks are falling
- Lower probability of success (lower win rate)
- Lower average R:R (stocks struggle to move up)
- **Do NOT trade aggressively** → large drawdowns guaranteed

**In favorable market conditions:**
- May make 1 year's worth of gains in 2-3 months
- **Trade aggressively**

---

## Performance Review (Monthly/Quarterly)

### Grave Mistakes (Never Acceptable)
- Taking trade without setup
- Violating initial stop loss
- Risking more than limits
- Averaging down on losing position
- Rebuying after exit hoping for recovery

### 1. Risk Management Review
- [ ] Win rate and ARR for period
- [ ] Average R multiple (winners vs losers)
- [ ] Market stance determination accuracy
- [ ] RPT consistency with OR metrics
- [ ] OR metrics violations
- [ ] Profile comfort level
- [ ] Intensity matrix alignment with market
- [ ] Under/over trading assessment
- [ ] Entry/exit execution quality
- [ ] Slippage issues
- [ ] Stop loss execution (losing >1.2R due to poor execution?)
- [ ] Liquidity filter adequacy
- [ ] Winning/losing streak handling

### 2. Technical Review
- [ ] Random trades without setups
- [ ] Poor setup trades
- [ ] Overtrading tendency
- [ ] Entry method consistency (50%+50% vs 100% live)
- [ ] Execution timing
- [ ] Buying extended stocks
- [ ] Stop loss placement quality
- [ ] Exit framework adherence
- [ ] Premature large exits (affecting average R multiple)
- [ ] P&L fluctuation influence on exits
- [ ] Extension judgment accuracy
- [ ] Earnings announcement handling
- [ ] Biggest winners/losers analysis

### 3. Routine Review
- [ ] Daily scan execution
- [ ] Watch list maintenance
- [ ] Setup tracker sheet updates
- [ ] Unnecessary screen time
- [ ] Screen time minimization efforts
- [ ] Post-market historical analysis time
- [ ] Journal up-to-date status
- [ ] Screenshot uploads and comments

### 4. Psychology Review
- [ ] Daily affirmations reading
- [ ] Impulsive actions/inactions
- [ ] Fear/greed/hope influence
- [ ] Copying others' trades
- [ ] Stress and composure levels
- [ ] Trading impact on personal life

### 5. Summary Submission
- Strengths and weaknesses
- Key learnings
- Submit to: contact@zalakunal.com
- Include: account value and return %

---

## Time Allocation Summary

| Activity | Time Required |
|----------|---------------|
| Market open routine | 5-20 min |
| Last hour before close | 10-60 min (reduces with experience) |
| Market close routine | 5 min |
| Post-market routine | 20-30 min (avg) |
| Weekend performance review | 1-2 hours (monthly/quarterly) |
| **Total daily** | **30-60 min** |

**Key Principle**: Minimize screen time during market hours. Maximize efficiency in post-market analysis. Less screen time often = better performance.

---

## Key Principles

1. **Precision is critical:** Every rule must be unambiguous and implementable
2. **Screen time paradox:** Less time during market hours often = better performance
3. **Journal is your best teacher:** Historical trades reveal repetitive mistakes and strengths
4. **Market conditions trump everything:** Respect market stance above all else
5. **Organization prevents chaos:** Structured watchlists and scans keep you focused
6. **Continuous learning never stops:** Weekend chart analysis compounds skill over time
7. **Respond to market, don't predict**: Trade what you see, not what you think
8. **Intensity adjustment is critical**: Most money lost during transitions when intensity not adjusted
9. **Get aggressive early in confirmed uptrend**: Only way to capture full move
10. **Act on charts, not P&L**: Stock-specific price action, not portfolio red/green