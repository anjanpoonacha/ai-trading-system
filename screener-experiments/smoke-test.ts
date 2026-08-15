/**
 * Pipeline smoke test: MIO → tv_scan (ADT) → tv_stock (SMA slope) → shortlist
 * Run: cd ../tradingview-mcp && bun ../nse-trading-system/screener-experiments/smoke-test.ts
 */

import { createFetcher } from "./src/services/fetcher.js";
import { handleScan } from "./src/tools/scan.js";
import { handleStock } from "./src/tools/stock.js";
import { handleScreen } from "./src/tools/screen.js";

const ADT_MIN_CR = 7;
const SLOPE_WINDOW = 5;
const SLOPE_SAMPLE = 20; // ponytail: cap for smoke test; full run needs batch or tv_scan offset columns

const fetcher = createFetcher();

// ── Stage 1: MIO screen ───────────────────────────────────────────────────────

async function stageMIO(): Promise<string[]> {
  console.log("[stage 1] tv_screen — mio_base_universe");
  const result = await handleScreen({ screens: ["mio_base_universe"] }) as any;
  const symbols: string[] = result.candidates.map((c: any) => c.symbol);
  console.log(`  → ${symbols.length} symbols from MIO`);
  return symbols;
}

// ── Stage 2: ADT filter ───────────────────────────────────────────────────────

async function stageADT(symbols: string[]) {
  console.log(`\n[stage 2] tv_scan — ADT >= ${ADT_MIN_CR} Cr on ${symbols.length} symbols`);
  const rows = await handleScan(fetcher, {
    symbols,
    columns: ["SMA20", "Value.Traded", "close", "name"],
  });

  const passed: { symbol: string; adt_cr: number; sma20: number }[] = [];
  for (const row of rows as any[]) {
    const d = row.data ?? row;
    const sym = d.name || row.symbol || "?";
    const adt_cr = (d["Value.Traded"] ?? 0) / 1e7;
    const sma20 = d.SMA20;
    if (adt_cr >= ADT_MIN_CR) passed.push({ symbol: sym, adt_cr, sma20 });
  }
  console.log(`  → ${passed.length}/${symbols.length} pass ADT filter`);
  return passed;
}

// ── Stage 3: SMA slope filter ─────────────────────────────────────────────────

async function stageSlope(symbols: { symbol: string }[]) {
  console.log(`\n[stage 3] tv_stock — SMA slope > 0 over ${SLOPE_WINDOW} bars on ${symbols.length} symbols`);
  const passed: string[] = [];

  for (const { symbol } of symbols) {
    const result = await handleStock(fetcher, { symbol, timeframe: "1D", count: 30, output: ["data"] } as any);
    const raw = typeof result === "string" ? JSON.parse(result) : result;
    const data = raw?.data ?? raw;
    const sma20: (number | null)[] = data?.indicators?.sma20 ?? [];
    const valid = sma20.filter((v): v is number => v != null);

    if (valid.length < SLOPE_WINDOW + 1) continue;

    const slope = valid[valid.length - 1] - valid[valid.length - 1 - SLOPE_WINDOW];
    if (slope > 0) passed.push(symbol);
  }

  console.log(`  → ${passed.length}/${symbols.length} pass slope filter`);
  return passed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("=== Pipeline smoke test ===");

const mioSymbols = await stageMIO();
const adtPassed = await stageADT(mioSymbols);
const sample = adtPassed.slice(0, SLOPE_SAMPLE);
if (adtPassed.length > SLOPE_SAMPLE)
  console.log(`\n  (slope stage capped at ${SLOPE_SAMPLE} for smoke test — full run needs bulk approach)`);
const shortlist = await stageSlope(sample);

console.log("\n=== SHORTLIST ===");
console.log(`  ${shortlist.length} stocks`);
shortlist.forEach(s => console.log(`  ${s}`));

const ok = adtPassed.length > 0;
console.log(`\n=== ${ok ? "PASS" : "FAIL"} — pipeline ran end to end ===`);
process.exit(ok ? 0 : 1);

