/**
 * Performance test: generate composite charts for 100 NSE stocks.
 *
 * Each chart: 1D candles + SMA20 + volume + CVD(12M) top, 188min CVD(12M,true,30S) bottom.
 * Saves to /tmp/charts/perf/
 *
 * Run: bun src/chart/test-perf.ts
 */

import { createFetcher } from "../services/fetcher";
import { createChartClient } from "./client";
import type { ChartBar, CVDBar, CompositeRequest } from "./types";
import type { CVDConfig } from "../types";

const NSE_100 = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK",
  "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "BAJFINANCE",
  "HCLTECH", "TITAN", "SUNPHARMA", "WIPRO", "TATAMOTORS",
  "ULTRACEMCO", "NESTLEIND", "NTPC", "POWERGRID", "M&M",
  "TATASTEEL", "TECHM", "INDUSINDBK", "JSWSTEEL", "ADANIENT",
  "ONGC", "COALINDIA", "BAJAJFINSV", "GRASIM", "CIPLA",
  "DRREDDY", "DIVISLAB", "BPCL", "BRITANNIA", "APOLLOHOSP",
  "EICHERMOT", "HEROMOTOCO", "HINDALCO", "TATACONSUM", "SBILIFE",
  "ADANIPORTS", "BAJAJ_AUTO", "HDFCLIFE", "UPL", "SHREECEM",
  "DABUR", "PIDILITIND", "SIEMENS", "HAVELLS", "GODREJCP",
  "AMBUJACEM", "DLF", "ICICIGI", "BERGEPAINT", "BIOCON",
  "MUTHOOTFIN", "NAUKRI", "COLPAL", "BANDHANBNK", "VOLTAS",
  "IRCTC", "INDUSTOWER", "GAIL", "BAJAJHIND", "MARICO",
  "TRENT", "JUBLFOOD", "LUPIN", "PIIND", "LALPATHLAB",
  "MPHASIS", "ASTRAL", "IDFCFIRSTB", "SAIL", "PNB",
  "BANKBARODA", "IOC", "PETRONET", "NHPC", "RECLTD",
  "PFC", "TATAPOWER", "VEDL", "JINDALSTEL", "CANBK",
  "IDBI", "CONCOR", "IRFC", "HAL", "BEL",
  "LTIM", "PERSISTENT", "COFORGE", "ETERNAL", "PAYTM",
];

function filterSentinels(cvd: { t: number; o: number; h: number; l: number; c: number }[]): CVDBar[] {
  return cvd
    .filter((d) => Math.abs(d.c) < 1e50 && Math.abs(d.o) < 1e50)
    .map((d) => ({ t: d.t, o: d.o, h: d.h, l: d.l, c: d.c }));
}

function computeSMA(bars: ChartBar[], period: number): (number | null)[] {
  return bars.map((_, i) => {
    if (i < period - 1) return null;
    const slice = bars.slice(i - period + 1, i + 1);
    return +(slice.reduce((s, b) => s + b.c, 0) / period).toFixed(2);
  });
}

interface Result {
  symbol: string;
  fetchMs: number;
  renderMs: number;
  totalMs: number;
  ok: boolean;
  error?: string;
}

async function main() {
  const count = NSE_100.length;
  console.log(`Performance test: ${count} stocks (with CVD)\n`);

  const fetcher = createFetcher();
  const chart = createChartClient();
  const results: Result[] = [];

  const cvdConfig1: CVDConfig = { anchorPeriod: "12M", useCustomTimeframe: false };
  const cvdConfig2: CVDConfig = { anchorPeriod: "12M", useCustomTimeframe: true, timeframe: "30S" };

  const overallStart = performance.now();

  for (let i = 0; i < count; i++) {
    const symbol = NSE_100[i];
    const stockStart = performance.now();

    try {
      // Fetch both panels (sequential — TradingView limits concurrent studies per session)
      const fetchStart = performance.now();
      const r1 = await fetcher.getBarsWithCVD(symbol, "1D", 188, cvdConfig1);
      const r2 = await fetcher.getBarsWithCVD(symbol, "188", 188, cvdConfig2);
      const fetchMs = performance.now() - fetchStart;

      const bars1: ChartBar[] = r1.bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      const bars2: ChartBar[] = r2.bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      const cvd1 = filterSentinels(r1.cvd);
      const cvd2 = filterSentinels(r2.cvd);
      const sma = computeSMA(bars1, 20);

      // Render composite
      const renderStart = performance.now();
      const png = await chart.renderComposite({
        symbol,
        exchange: "NSE",
        panels: [
          { bars: bars1, cvd: cvd1, sma, smaPeriod: 20, volume: true, cvdColor: { up: "#26a69a", down: "#ef5350" }, timeframeLabel: "1D" },
          { bars: bars2, cvd: cvd2, volume: false, cvdColor: { up: "#26a69a", down: "#ef5350" }, timeframeLabel: "188min" },
        ],
        weights: [76, 24],
        options: { width: 1200, height: 1000, theme: "dark", paneRatios: [0.65, 0.14, 0.21] },
      });
      const renderMs = performance.now() - renderStart;

      // Save
      const lastBarDate = new Date(bars1.at(-1)!.t * 1000).toISOString().split("T")[0];
      const outPath = `/tmp/charts/perf/${symbol}-1D-${lastBarDate}.png`;
      await Bun.write(outPath, png);
      const totalMs = performance.now() - stockStart;

      results.push({ symbol, fetchMs, renderMs, totalMs, ok: true });
      const n = String(i + 1).padStart(3);
      console.log(`  [${n}/${count}] ${symbol.padEnd(12)} fetch=${fetchMs.toFixed(0).padStart(5)}ms  render=${renderMs.toFixed(0).padStart(4)}ms  total=${totalMs.toFixed(0).padStart(5)}ms  ✅`);
    } catch (err: any) {
      const totalMs = performance.now() - stockStart;
      results.push({ symbol, fetchMs: 0, renderMs: 0, totalMs, ok: false, error: err.message });
      const n = String(i + 1).padStart(3);
      console.log(`  [${n}/${count}] ${symbol.padEnd(12)} ❌ ${err.message}`);
    }
  }

  const overallMs = performance.now() - overallStart;

  // Stats
  const ok = results.filter((r) => r.ok);
  const failed = results.filter((r) => !r.ok);
  const avgFetch = ok.reduce((s, r) => s + r.fetchMs, 0) / ok.length;
  const avgRender = ok.reduce((s, r) => s + r.renderMs, 0) / ok.length;
  const avgTotal = ok.reduce((s, r) => s + r.totalMs, 0) / ok.length;
  const sorted = ok.map((r) => r.totalMs).sort((a, b) => a - b);
  const p50 = sorted[Math.floor(ok.length * 0.5)];
  const p95 = sorted[Math.floor(ok.length * 0.95)];
  const maxFetch = Math.max(...ok.map((r) => r.fetchMs));
  const maxRender = Math.max(...ok.map((r) => r.renderMs));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`RESULTS: ${ok.length}/${count} succeeded, ${failed.length} failed`);
  console.log(`${"=".repeat(60)}`);
  console.log(`\n  Total wall time:     ${(overallMs / 1000).toFixed(1)}s`);
  console.log(`  Avg per chart:       ${avgTotal.toFixed(0)}ms`);
  console.log(`  P50:                 ${p50?.toFixed(0)}ms`);
  console.log(`  P95:                 ${p95?.toFixed(0)}ms`);
  console.log(`\n  Fetch (avg/max):     ${avgFetch.toFixed(0)}ms / ${maxFetch.toFixed(0)}ms`);
  console.log(`  Render (avg/max):    ${avgRender.toFixed(0)}ms / ${maxRender.toFixed(0)}ms`);
  console.log(`\n  Throughput:          ${(ok.length / (overallMs / 1000)).toFixed(2)} charts/sec`);

  if (failed.length > 0) {
    console.log(`\n  Failed:`);
    for (const f of failed) console.log(`    ${f.symbol}: ${f.error}`);
  }

  fetcher.close();
  chart.close();
}

main().catch((err) => {
  console.error("❌ Perf test crashed:", err.message);
  process.exit(1);
});
