# Experiment 002 — TV MCP Filters (ADT + SMA Slope)

**Date run:** 2026-08-15  
**Input:** 8 labeled NSE cases (mocked MIO output)

## Filters Applied

| Filter | Tool | Threshold | Notes |
|--------|------|-----------|-------|
| ADT | tv_scan / Value.Traded | >= 7 Cr | Value.Traded / 1e7 |
| SMA slope | tv_stock / indicators.sma20 | > 0 over 5 bars | slope = sma20[-1] - sma20[-6] |

## Results

| Symbol | ADT (Cr) | SMA20 | ADT Pass | Slope | Slope Pass | Final |
|--------|----------|-------|----------|-------|------------|-------|
| USHAMART | 14.6 | 504.8 | ✓ | +0.77 | ✓ | **IN** |
| SHYAMMETL | 69.1 | 1020.7 | ✓ | -10.46 | ✗ | out |
| OLECTRA | 118.1 | 1352.7 | ✓ | -2.05 | ✗ | out |
| PATELENG | 5.1 | 28.6 | ✗ | — | — | out |
| ANGELONE | 112.0 | 300.9 | ✓ | -11.22 | ✗ | out |
| CDSL | 64.9 | 1340.0 | ✓ | -21.45 | ✗ | out |
| NEULANDLAB | 195.3 | 20330.2 | ✓ | +994.55 | ✓ | **IN** |
| BAJAJHIND | 10.7 | 17.4 | ✓ | +0.11 | ✓ | **IN** |

**Shortlist: USHAMART, NEULANDLAB, BAJAJHIND (3/8)**

## Key Findings

- `tv_scan` response is nested: `row.data["Value.Traded"]` not `row["Value.Traded"]`
- `handleStock` response is nested: `result.data.indicators.sma20` not `result.indicators.sma20`
- Both tools work reliably. Pipeline runs in ~30s for 8 symbols (tv_stock is serial WebSocket)
- SMA slope filter is effective — eliminated 4 stocks currently in pullback/distribution

## Pending

- Wire real MIO output: add `"mio_base_universe"` entry to `screens.json` with experiment 001 MIO URL
- Scale test: run on full 657-symbol MIO output (tv_stock serial calls will be slow ~10-15 min)
- Consider tv_scan-only slope proxy for bulk runs (request SMA20 + SMA20[5d] if TV Scanner supports offset columns)

## Verdict

✓ TV MCP filter stage works. Two-stage filter (ADT + slope) correctly separates setups from pullbacks.
