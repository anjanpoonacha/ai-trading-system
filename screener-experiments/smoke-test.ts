/**
 * Pipeline smoke test: MIO → tv_scan (ADT) → tv_stock (SMA slope) → shortlist
 * Run: cd ../tradingview-mcp && bun ../nse-trading-system/screener-experiments/smoke-test.ts
 *
 * MIO stage is mocked with 8 labeled NSE cases from experiment 001.
 * TODO: add "mio_base_universe" to screens.json, replace mock with handleScreen().
 */

import { createFetcher } from "./src/services/fetcher.js";
import { handleScan } from "./src/tools/scan.js";
import { handleStock } from "./src/tools/stock.js";

const MIO_MOCK = ["USHAMART", "SHYAMMETL", "OLECTRA", "PATELENG", "ANGELONE", "CDSL", "NEULANDLAB", "BAJAJHIND"];
const ADT_MIN_CR = 7;
const SLOPE_WINDOW = 5;

const fetcher = createFetcher();

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
    const tag = adt_cr >= ADT_MIN_CR ? "PASS" : "FAIL";
    console.log(`  ${sym.padEnd(12)} ADT=${adt_cr.toFixed(1).padStart(6)} Cr  SMA20=${String(sma20?.toFixed(1) ?? "n/a").padStart(8)}  [${tag}]`);
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

    if (valid.length < SLOPE_WINDOW + 1) {
      console.log(`  ${symbol.padEnd(12)} SMA20 too short (${valid.length} values)  [SKIP]`);
      continue;
    }

    const slope = valid[valid.length - 1] - valid[valid.length - 1 - SLOPE_WINDOW];
    const tag = slope > 0 ? "PASS" : "FAIL";
    console.log(`  ${symbol.padEnd(12)} SMA20 slope=${slope.toFixed(2).padStart(8)} over ${SLOPE_WINDOW}d  [${tag}]`);
    if (slope > 0) passed.push(symbol);
  }

  console.log(`  → ${passed.length}/${symbols.length} pass slope filter`);
  return passed;
}

// ── Main ──────────────────────────────────────────────────────────────────────

console.log("=== Pipeline smoke test ===");
console.log(`[stage 1] MIO mock — ${MIO_MOCK.length} symbols`);
console.log("  (replace with handleScreen('mio_base_universe') once added to screens.json)");

const adtPassed = await stageADT(MIO_MOCK);
const shortlist = await stageSlope(adtPassed);

console.log("\n=== SHORTLIST ===");
shortlist.length
  ? shortlist.forEach(s => console.log(`  ${s}`))
  : console.log("  (none — all filtered out; check thresholds)");

const ok = adtPassed.length > 0;
console.log(`\n=== ${ok ? "PASS" : "FAIL"} — pipeline ran end to end ===`);
process.exit(ok ? 0 : 1);
