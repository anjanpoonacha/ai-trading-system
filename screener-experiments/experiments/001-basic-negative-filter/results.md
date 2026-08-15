# Experiment 001 — Results

**Date run:** 2026-08-14  
**Universe:** NSE (~2200 stocks)

---

## Formula Evolution (what we tried)

| # | Formula snippet | Result | Problem |
|---|----------------|--------|---------|
| v1 | `price >= sma(20) * 0.95` | ~760 | Too loose; stocks clearly below 20 SMA passing |
| v2 | `! (sma(20) trend_dn 15)` | ~969 | Syntax error at `trend_dn` without parentheses → fixed: `! (sma(20) trend_dn 15)` gave 969 |
| v3 | `sma(10) > sma(20) > sma(30)` | ~481 | MACI rejected: momentum filter, not negative filter. Eliminates valid bases where SMAs are flat/converging |
| v4 | `sma(10) > sma(20) * 0.97` | passed bad stocks | Arithmetic on MA has parsing ambiguity. NTPC (SMA10=343, SMA20=345) still passed |
| v5 | `cmf(20) > -0.1` | added | Weak signal alone; not standalone useful |
| **v6 (current)** | `count(sma(20) < sma(20)@1, 20) < 10` | **657** | Threshold not yet validated against labeled cases |

---

## Current Formula

```
exch(nse)
and advol >= 50
and count(sma(20) < sma(20)@1, 20) < 10
```

**657 stocks** — advol >= 50 = ADT ≥ 5cr

---

## Key MIO Syntax Lessons

- `advol` — bare, no parentheses. `advol()` = error
- `exch(nse)` — lowercase, not `EXCHANGE = "NSE"`
- `price` — not `close`
- `! (condition)` — negation requires parentheses when applied to named indicators
- `sma(N)` — works. `sma(N, C)` = error
- `count(expr, N)` — counts how many of last N bars expr was true
- `@1` — 1 bar lookback. `@[0..N]` = OR range. `@{0..N}` = AND range
- `trend_dn N` syntax requires `! (sma(20) trend_dn N)` — confirmed working
- Arithmetic on named indicators (`sma(20) * 0.97`) has silent parsing ambiguity — avoid

---

## Pending Validation

Cases in `data/cases.db` have **null dates** so historical backtest at case date is not possible yet.

Plan: pull current OHLCV via `tv_stock` for each `good_base`/`good_entry` NSE symbol → compute
`count(sma(20) < sma(20)@1, 20)` manually → check if current formula would pass or block them.

Labeled NSE cases to validate against:
- `good_base`: USHAMART, SHYAMMETL, OLECTRA, PATELENG, TATAMOTORS, ANGELONE, CDSL
- `good_entry`: NEULANDLAB, BAJAJHIND

(AMC, RVLV, LSIL appear to be US stocks seeded by mistake — skip)

---

## MACI Review Findings

**Gap identified by critic:** Formula cannot distinguish a stock hugging 10 SMA vs one 25% above it.
Extended/already-running stocks pass the filter. This is the biggest false positive class.
→ Reserved for experiment 002, handled at TradingView MCP stage (not MIO).

---

## Verdict

- [x] Too many results (657 — threshold needs tuning)
- [ ] Too few results
- [ ] Wrong stocks surviving (partially — extended stocks pass; pending validation)

---

## Next Experiment

**002 — Filter extended stocks (TradingView MCP stage)**
After MIO outputs ~657, apply TV MCP filter to remove stocks >15–20% above 20 SMA.
Design: `(close - sma20) / sma20 < 0.15` using `tv_scan` or `tv_screen`.
