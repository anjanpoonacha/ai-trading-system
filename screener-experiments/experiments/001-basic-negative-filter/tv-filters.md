# Experiment 001 — TV MCP Filters (Post-MIO)

Applied after MIO narrows the universe. These use computed values the TV MCP tools can return.

## Purpose

MIO handles cheap binary filters. TV MCP handles anything that needs a computed slope or
a metric derived from recent candles (e.g., 20 SMA slope, ADT in crores).

---

## Filter 1: 20 SMA Slope Direction

**Tool:** `tv_stock` (per-symbol) or `tv_scan` (batch)  
**Metric:** 20-period SMA value on day N vs day N-5  
**Condition:** `SMA20_today > SMA20_5days_ago` → slope is positive → keep  
**Drop if:** slope is flat-to-negative (SMA declining over last 5 bars)

**Rationale:** A stock can be "above 20 SMA" while the SMA itself is rolling over.
A rising 20 SMA confirms the uptrend is intact. Flat or declining = downtrend.

**Threshold:** `(SMA20_today - SMA20_5days_ago) / SMA20_5days_ago > 0` (positive slope)  
Tighten in later experiments if too many false positives.

---

## Filter 2: ADT (Average Daily Turnover) in Crores

**Tool:** `tv_stock` (use `avg_vol` × `close` columns) or Champion Trader Volume indicator  
**Metric:** `ADT = (20-day avg volume × current price) / 10,000,000`  
**Condition:** `ADT >= 7 Cr` (per CDS methodology minimum; 10 Cr preferred)

**Rationale:** MIO's liquidity filter (`>= 5 Cr`) is a loose floor. TV MCP lets us confirm
with the exact 20-day avg volume × price calculation at full precision.

**Note:** MIO floor is set lower (5 Cr) intentionally so MIO doesn't over-filter.
TV MCP raises the bar to 7 Cr here. Adjust upward as account size grows.

---

## Combined Logic

```
MIO output (NSE, price ≥ ₹20, ADT ≥ 5 Cr, not >5% below 20 SMA)
  → TV MCP filter: 20 SMA slope > 0 (last 5 bars)
  → TV MCP filter: ADT ≥ 7 Cr
  → Remaining = shortlist for manual chart review
```

---

## Parameters to Tune Later

| Parameter | This Experiment | Notes |
|-----------|----------------|-------|
| Price floor | ₹20 | May raise to ₹50 to cut more noise |
| MIO ADT floor | 5 Cr | Loose on purpose — TV MCP confirms |
| TV ADT floor | 7 Cr | Per CDS minimum; raise for larger positions |
| Downtrend threshold | 5% below 20 SMA | May tighten to 2% in later experiments |
| SMA slope window | 5 bars | Try 10 bars if too noisy |
