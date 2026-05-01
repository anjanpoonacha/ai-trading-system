# Chart Renderer

Server-side chart image generation using TradingView's `lightweight-charts`.
Produces PNG candlestick charts with volume, SMA, and CVD panes.

## Architecture

```
BUN PROCESS                         NODE PROCESS (warm worker)
┌─────────────────────┐             ┌──────────────────────────────┐
│  agent / MCP tool   │             │  worker.ts                   │
│         │           │   stdin     │    │                         │
│         ▼           │ ─────────►  │    ▼                         │
│  client.ts          │             │  renderer.ts                 │
│         ▲           │  ◄───────── │    │                         │
│         │           │   stdout    │    ▼                         │
│    PNG Buffer       │   (binary)  │  lightweight-charts + jsdom  │
└─────────────────────┘             │    │                         │
                                    │    ▼                         │
                                    │  @napi-rs/canvas (pixel engine)
                                    └──────────────────────────────┘
```

### Dependency Layers

```
┌────────────────────────────────────────────────────────────────┐
│  client.ts          Bun process — spawns & manages worker      │
├────────────────────────────────────────────────────────────────┤
│  protocol.ts        Message framing (shared by client+worker)  │
├────────────────────────────────────────────────────────────────┤
│  worker.ts          Node process — stdin/stdout IPC loop       │
├────────────────────────────────────────────────────────────────┤
│  renderer.ts        Pure: ChartRequest → PNG Buffer            │
├────────────────────────────────────────────────────────────────┤
│  lightweight-charts  Chart logic (candlesticks, axes, panes)   │
│  jsdom               Fake DOM for lightweight-charts           │
│  @napi-rs/canvas     Canvas pixel backend for jsdom            │
└────────────────────────────────────────────────────────────────┘
```

### Module Responsibilities

| File | Runtime | Role |
|------|---------|------|
| `types.ts` | Any | Shared interfaces (ChartRequest, ChartOptions, etc.) |
| `protocol.ts` | Any | Encode/decode messages between client and worker |
| `renderer.ts` | Node | jsdom setup + lightweight-charts render → PNG |
| `worker.ts` | Node | Long-running process, reads stdin, calls renderer, writes stdout |
| `client.ts` | Bun | Spawns worker, sends requests, returns PNG buffers |

## Usage

```typescript
import { createChartClient } from "./chart/client";

const chart = createChartClient();
const png = await chart.render({
  bars,                              // OHLCV from fetcher
  cvd,                               // optional, from fetcher.getBarsWithCVD()
  sma: computedSmaArray,             // optional, from compute service
  options: { title: "RELIANCE 1D" }
});
await Bun.write("/tmp/chart.png", png);
chart.close();
```

## Test Standalone

```bash
node --import tsx src/chart/renderer.ts   # renders sample → /tmp/chart-test.png
echo '<json>' | node --import tsx src/chart/worker.ts  # pipe test
bun src/chart/client.ts                   # full round-trip integration test
```

---

## ADR

### ADR-1: Use lightweight-charts for rendering (not custom canvas drawing)

**Context:** Need server-side candlestick chart images with volume + CVD panes.

**Options considered:**
1. `@napi-rs/canvas` custom drawing (~400-600 LOC, 30-50h effort, 6/10 quality)
2. `lightweight-charts` via jsdom + canvas provider (8-12h effort, 10/10 quality)
3. Chart.js + chartjs-chart-financial (no native multi-pane support)

**Decision:** Option 2. The charts are for teaching — visual fidelity to TradingView matters. The effort difference (12h vs 50h) and quality difference (native TV look vs manual recreation) both favor lightweight-charts.

**Tradeoff accepted:** Requires Node.js subprocess (lightweight-charts + jsdom + canvas provider cannot run in Bun due to native addon constraints).

---

### ADR-2: Warm worker pattern over cold subprocess

**Context:** Each chart render needs jsdom + module initialization (~300-500ms). Agent generates 1-3 charts per query.

**Decision:** Persistent Node worker process communicating via stdin/stdout. Amortizes init cost. ~160-300ms per render vs ~800-1500ms cold.

**Safety:** Worker auto-exits after 200 renders (memory creep prevention). Client auto-restarts on exit or timeout.

---

### ADR-3: @napi-rs/canvas as jsdom's canvas backend (not node-canvas)

**Context:** jsdom needs a canvas provider to rasterize pixels. Two options: `canvas` (node-canvas, Cairo-based) or `@napi-rs/canvas` (Skia-based).

**Decision:** `@napi-rs/canvas`. Ships prebuilt binaries for macOS ARM64/x64 and Linux x64. Zero system dependencies — no `brew install cairo pango` step.

---

### ADR-4: Pin lightweight-charts to exact version

**Context:** Server-side rendering relies on undocumented internals (jsdom mocks for matchMedia, location.href). Library does not officially support SSR.

**Decision:** Pin `lightweight-charts@5.2.0` exactly. Do not upgrade without testing the renderer. The mocks are version-coupled — minor bumps have historically broken SSR users.

---

### ADR-5: Binary protocol (not base64)

**Context:** PNG images are 50-150KB. Encoding as base64 adds ~33% overhead.

**Decision:** Response is a JSON header line (`{"ok":true,"size":N}\n`) followed by raw binary PNG bytes. Request is JSON (small — ~50KB for 500 bars). This keeps IPC efficient without adding complexity.
