# tradingview-mcp

MCP server for fetching NSE stock data from TradingView. Two tools:

- **`tv_scan`** — snapshot indicators for multiple stocks (Scanner API, no auth)
- **`tv_data`** — historical OHLCV + computed indicators for one stock (WebSocket, ~90ms)

## Setup

```bash
cd tradingview-mcp && bun install
```

## OpenCode config (`.opencode/opencode.jsonc`)

```jsonc
{
  "mcp": {
    "tradingview": {
      "type": "local",
      "command": ["bun", "run", "/path/to/tradingview-mcp/src/server.ts"],
      "enabled": true,
      "environment": {
        "TV_SESSION_ID": "optional_for_cvd",
        "TV_SESSION_SIGN": "optional_for_cvd",
        "PATH": "/Users/you/.bun/bin:/opt/homebrew/bin:/usr/bin:/bin"
      }
    }
  }
}
```

Auth is only needed for CVD. Historical bars + scanner work free.

## Tools

### `tv_scan`

```json
{ "symbols": ["RELIANCE", "TCS"], "columns": ["close", "RSI", "SMA200", "sector"] }
```

Available columns: `close`, `SMA10/20/50/200`, `EMA10/20/50/200`, `RSI`, `volume`, `average_volume_10d_calc`, `average_volume_30d_calc`, `Value.Traded`, `ATR`, `Volatility.D`, `price_52_week_high/low`, `Perf.W/1M/3M`, `market_cap_basic`, `sector`, `industry`, `Recommend.All`.

### `tv_data`

```json
{ "symbol": "RELIANCE", "timeframe": "1D", "count": 500, "cvd": false }
```

Returns: full OHLCV bars, computed indicator arrays (SMA/EMA/volume avg), metrics (slopes, volume contraction, base depth, TRP, ADT, relative volume), and optionally CVD.

Timeframes: `1`, `5`, `15`, `30`, `60`, `1D`, `1W`, `1M`

## Test standalone (no MCP)

```bash
bun src/connection/protocol.ts    # protocol unit test
bun src/connection/websocket.ts   # fetch bars from TradingView
bun src/connection/manager.ts     # full connection lifecycle
bun src/services/compute.ts       # indicator math
bun src/services/fetcher.ts       # bars + scanner combined
```

## Architecture

```
Tools (thin wrappers) → Services (Fetcher, Compute) → Connection (WebSocket, Auth, Protocol, Queue)
                       ↘ Chart (client → worker → renderer via lightweight-charts)
```

All computed values (SMA, EMA, volume averages) validated to match TradingView exactly (36/36 checks pass).

Chart renderer runs as a Node subprocess (lightweight-charts requires DOM). See [`src/chart/README.md`](src/chart/README.md).
