# NSE Trading System

A learning-based chart analysis system for NSE stocks. Learns from labeled chart examples, extracts patterns from data, and builds toward automated screening.

**Approach:** Inductive — observe cases → extract patterns → build screener → evaluate → trade.

## Structure

```
docs/
  reference/        9 strategy reference docs (distilled from course)
  visuals/          Screenshot appendices for each doc
src/
  store/            Case store (SQLite schema + CRUD)
data/
  cases.db          Case library (17 seed cases from course)
charts/
  cases/            Labeled chart images + metadata per case
tradingview-mcp/    TradingView data fetching tool
scripts/            Distillation + seeding scripts
transcripts/        Raw course transcripts (45 files)
visuals/            Video clip screenshots + analysis JSON
```

## Setup

```bash
bun install
bun scripts/seed-cases.ts   # Creates data/cases.db with 17 course examples
bun test                    # 11 tests passing
```

## Current Status

- **Done:** Knowledge extraction pipeline, case store, 17 seed cases with images
- **In progress:** TradingView MCP tool (WebSocket + Scanner API)
- **Next:** Teaching interface → pattern extraction → screener

See `SYSTEM-DESIGN.md` for full architecture.
