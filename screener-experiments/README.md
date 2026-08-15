# Screener Experiments

Track every MIO + TradingView MCP filter attempt. Before proposing a new filter, read this history.

## Structure

```
experiments/
  001-<name>/
    mio-formula.mio       MIO formula used
    tv-filters.md         TradingView MCP filters applied after MIO
    results.md            outcome: stock count, sample list, verdict, why it failed/worked
```

## Lessons Learned

_Updated after each experiment._

| # | Key Filter | Count | Verdict |
|---|-----------|-------|---------|
| 001 | `advol >= 50` + `count(sma(20) < sma(20)@1, 20) < 10` | 657 | Too many; threshold not validated. Extended stocks pass — fix in 002 |
