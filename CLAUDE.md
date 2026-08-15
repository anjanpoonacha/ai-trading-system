# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Runtime

Use Bun throughout — `bun <file>`, `bun test`, `bun install`. Use `bun:sqlite`, `Bun.file`, `Bun.$`. No Node, no Express, no dotenv.

## Commands

```bash
bun install
bun scripts/seed-cases.ts       # seed data/cases.db with 17 course examples
bun test                        # runs tests/store.test.ts (11 passing)
bun agents/runtime/cli.ts <agent-name> "<task>"   # run an agent
```

## Architecture

**Inductive pipeline:** observe labeled chart cases → extract patterns → build screener → evaluate → trade.

**What's built:**
- `src/store/` — SQLite case store (`schema.ts` + `cases.ts`), DB at `data/cases.db`
- `agents/` — agent framework using `@openai/agents`, routed via local LLM proxy at `localhost:3030`. Three agents: `case-manager`, `chart-generator`, `chart-reviewer`
- `agents/runtime/cli.ts` — entry point; loads agent `.md` definitions from `agents/definitions/`, wires MCP via `agents/mcp-servers.json`
- `tradingview-mcp/` — separate Bun server providing `tv_scan`, `tv_stock`, `tv_screen` tools over MCP (run from `../tradingview-mcp`)
- `docs/reference/` — 9 strategy docs distilled from course transcripts (source of truth for trading methodology)
- `charts/cases/` — labeled chart images + `metadata.json` per case

**What's not built yet:** teaching interface, pattern extraction engine, screener, evaluator.

## Screener Experiments

Track all MIO + TradingView MCP filter attempts in `screener-experiments/`. Every experiment gets its own numbered folder with the formula used, filters applied, result count, sample stocks, and verdict. Agents must read this history before proposing new filters.

## Stock Analysis Framework

When asked to analyse a stock's current position, always answer two questions:

1. **Was there a tell before a prior significant move?** Go back into historical data and find it — CVD, volume, footprint, or their combination. Identify exactly what it was and when it appeared relative to the price move.
2. **Is anything similar happening now?** Compare current data to that historical pattern. Yes / no / partial — be specific about what matches and what doesn't.

Never analyse the present in isolation. The historical tell is the baseline.

**How to find the tell:** Run `cvdAnchor` `"3M"` and `"6M"` together. The tell often appears on 3M while 6M still looks bearish — divergence between anchors is itself a signal. Also check: volume on key days (absorption vs distribution), footprint delta and buy/sell imbalances at support levels.

**CVD wicks — always read OHLC, not just close.** CVD has high/low intrabar. `tail` (close−low) = how much sellers pushed but buyers recovered. `wick` (high−close) = how much buyers pushed but sellers faded. `tail >> wick` on high volume = buyers in control = conviction. `wick >> tail` = demand surge sold into = distribution. The close alone misses who won the intrabar fight.

**Anchor rule:** CVD values are only comparable within the same anchor window, never across a reset. A reset is visible as a sharp jump toward zero between two adjacent bars. Shorter anchor = earlier tell; longer anchor = trend confirmation.

**Output order:** (1) historical tell — what, when, how many days before the move; (2) current state — same indicators, same anchors; (3) match/partial/no; (4) the price or CVD level that confirms or invalidates.

Full framework: `tradingview-mcp/docs/analysis-framework.md`

## Trading Methodology

See `docs/reference/` for the full strategy. Key current rules:
- Trend filter: **20 SMA only** — 200 SMA and stage analysis are no longer part of the system
- Screener approach: MIO for negative filtering (eliminate garbage) → TradingView MCP for computed filters → shortlist for manual chart review
- Universe: NSE stocks, liquidity-filtered by ADT (crores)

## Case Store Schema

Labels: `good_base | bad_base | good_entry | failed_entry | breakout_real | breakout_fake | avoid | borderline | distribution | stage_4_trap`

Key fields: `sma_20`, `volume_contraction_pct`, `base_depth_pct`, `trp_pct`, `adt_cr`, `outcome`, `outcome_pct`
