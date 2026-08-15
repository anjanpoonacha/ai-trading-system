/**
 * Pipeline: MIO → tv_scan (ADT + SMA slope) → shortlist
 * Run: cd ../tradingview-mcp && bun ../nse-trading-system/screener-experiments/smoke-test.ts
 *
 * All filtering done in two batch calls — no per-symbol WebSocket needed.
 * SMA slope = SMA20 > SMA20[1] (today vs yesterday), computed via TV Scanner.
 */

import { createFetcher } from "./src/services/fetcher.js";
import { handleScan } from "./src/tools/scan.js";
import { handleScreen } from "./src/tools/screen.js";

const ADT_MIN_CR = 7;
const fetcher = createFetcher();

// Stage 1: MIO
console.log("=== Pipeline ===");
console.log("[1] tv_screen — mio_base_universe");
const mio = await handleScreen({ screens: ["mio_base_universe"] }) as any;
const symbols: string[] = mio.candidates.map((c: any) => c.symbol);
console.log(`    → ${symbols.length} symbols`);

// Stage 2+3: single tv_scan batch — ADT + SMA slope
console.log("[2] tv_scan — ADT + SMA slope (batch)");
const rows = await handleScan(fetcher, {
  symbols,
  columns: ["name", "close", "Value.Traded", "SMA20", "SMA20[1]"],
}) as any[];

const shortlist = rows.filter(row => {
  const d = row.data ?? row;
  const adt_cr = (d["Value.Traded"] ?? 0) / 1e7;
  const slopeUp = (d["SMA20"] ?? 0) > (d["SMA20[1]"] ?? 0);
  return adt_cr >= ADT_MIN_CR && slopeUp;
}).map(row => (row.data ?? row).name || row.symbol);

console.log(`    → ${shortlist.length} pass (ADT >= ${ADT_MIN_CR} Cr + SMA20 rising)`);

console.log("\n=== SHORTLIST ===");
shortlist.forEach(s => console.log(`  ${s}`));
console.log(`\nTotal: ${shortlist.length} stocks`);
process.exit(0);


