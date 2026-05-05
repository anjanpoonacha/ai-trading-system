/**
 * tv_stock — unified tool combining tv_data + tv_chart
 *
 * Single MCP call → single WS batch fetch (2 panels) → compute indicators →
 * branch on `output` param to return data JSON, chart PNG, or both.
 *
 * Always uses dual-session batch (like tv_chart did), so both CVD datasets
 * (native + custom TF) are available regardless of output mode.
 */

import { resolve, extname } from "path";
import { mkdir } from "fs/promises";
import type { Fetcher } from "../services/fetcher";
import { computeAll } from "../services/compute";
import { createChartClient, type ChartClient } from "../chart/client";
import type { ChartBar, CVDBar, PanelRequest, CompositeRequest } from "../chart/types";
import type { Bar, CVDPoint, CVDConfig, FootprintDaily } from "../types";
import { footprintService } from "../services/footprint";

const DEFAULT_CHART_DIR = "/tmp/charts";

// ─── Input / Output types ────────────────────────────────────────────────────

export interface StockInput {
  symbol: string;
  timeframe?: string;         // default "1D"
  count?: number;             // default 300

  /** What to return. Default: ["data", "chart"] */
  output?: ("data" | "chart")[];

  /** End date (YYYY-MM-DD). Returns bars ending on this date. */
  toDate?: string;

  /** Fetch Volume Footprint data (daily fp_buy_vol/fp_sell_vol). Requires TV_SESSION_ID. Default: false */
  footprint?: boolean;
  /** Number of 60-min bars to request for footprint (default 4000, max 4000). */
  footprintBars?: number;

  // Chart-specific (ignored if output doesn't include "chart")
  sma?: number;               // default 20 (0 to disable)
  volumeMA?: number;          // default 30 (0 to disable)
  cvdTimeframe?: string;      // bottom CVD panel timeframe in minutes. Default "188"
  cvdBars?: number;           // bottom CVD bar count. Default 188
  cvdAnchor?: string;         // CVD anchor/reset period. Default "12M"
  cvdCustomTF?: boolean;      // use custom TF for bottom CVD. Default true
  cvdResolution?: string;     // CVD custom TF resolution. Default "30S"
  savePath?: string;          // chart output folder. Default /tmp/charts/
  width?: number;             // default 1200
  height?: number;            // default 1000
  theme?: "dark" | "light";   // default "dark"
  paneRatios?: number[];   // default [0.65, 0.14, 0.21]
  panelWeights?: number[];         // default [76, 24]
}

export interface StockDataOutput {
  symbol: string;
  meta: { name: string; exchange: string; description: string; type: string } | null;
  timeframe: string;
  dateRange: { from: string | null; to: string | null };
  bars: Bar[];
  indicators: {
    sma10: (number | null)[];
    sma20: (number | null)[];
    sma50: (number | null)[];
    sma200: (number | null)[];
    ema10: (number | null)[];
    ema20: (number | null)[];
    ema50: (number | null)[];
    ema200: (number | null)[];
    volAvg20: (number | null)[];
    volAvg50: (number | null)[];
  };
  metrics: Record<string, number | null>;
  cvd: CVDPoint[] | null;
  cvdBottom: CVDPoint[] | null;
  footprint: FootprintDaily[] | null;
}

export interface StockChartOutput {
  path: string;
  image?: Buffer;
}

export interface StockOutput {
  data?: StockDataOutput;
  chart?: StockChartOutput;
}

// ─── Shared utilities ────────────────────────────────────────────────────────

function barsNeededForDate(toDate: string, timeframe: string, desiredBars: number): number {
  const targetTs = new Date(toDate).getTime();
  const nowTs = Date.now();
  const diffMs = nowTs - targetTs;
  if (diffMs <= 0) return desiredBars;

  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  let barsFromNow: number;

  switch (timeframe) {
    case "1D": barsFromNow = Math.ceil(diffDays * 5 / 7); break;
    case "1W": barsFromNow = Math.ceil(diffDays / 7); break;
    case "1M": barsFromNow = Math.ceil(diffDays / 30); break;
    default: {
      const minutes = parseInt(timeframe) || 1;
      const tradingMinutesPerDay = 375;
      barsFromNow = Math.ceil((diffDays * 5 / 7) * tradingMinutesPerDay / minutes);
      break;
    }
  }

  return Math.ceil((barsFromNow + desiredBars) * 1.2);
}

function trimBarsToDate<T extends { t: number }>(arr: T[], toDateStr: string): T[] {
  const targetTs = Math.floor(new Date(toDateStr + "T23:59:59Z").getTime() / 1000);
  const cutIdx = arr.findIndex((b) => b.t > targetTs);
  if (cutIdx > 0) return arr.slice(0, cutIdx);
  return arr;
}

function getHistoricalCvdResolution(toDate: string | undefined, defaultRes: string, desiredBars: number, timeframe: string): string {
  if (!toDate) return defaultRes;

  const targetTs = new Date(toDate).getTime();
  const minutes = parseInt(timeframe) || 375;
  const tradingMinutesPerDay = 375;
  const barsPerDay = tradingMinutesPerDay / minutes;
  const tradingDaysNeeded = desiredBars / barsPerDay;
  const calendarDaysNeeded = tradingDaysNeeded * 7 / 5;
  const oldestDataTs = targetTs - calendarDaysNeeded * 24 * 60 * 60 * 1000;

  const now = new Date();
  const monthsFromNow = (now.getFullYear() * 12 + now.getMonth()) -
    (new Date(oldestDataTs).getFullYear() * 12 + new Date(oldestDataTs).getMonth());

  if (monthsFromNow < 3) return defaultRes;
  if (monthsFromNow < 6) return "1";
  if (monthsFromNow < 12) return "5";
  if (monthsFromNow < 60) return "10";
  return "15";
}

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

function resolveSavePath(folder: string | undefined, symbol: string, timeframe: string, lastBarTs: number): string {
  const date = new Date(lastBarTs * 1000).toISOString().split("T")[0];
  const filename = `${symbol.toUpperCase()}-${timeframe}-${date}.png`;
  const dir = folder && (folder.endsWith("/") || !extname(folder)) ? folder : DEFAULT_CHART_DIR;
  return resolve(dir, filename);
}

// ─── Chart client singleton ──────────────────────────────────────────────────

let sharedClient: ChartClient | null = null;

function getChartClient(): ChartClient {
  if (!sharedClient) sharedClient = createChartClient();
  return sharedClient;
}

export function closeStock() {
  sharedClient?.close();
  sharedClient = null;
}

// ─── Main handler ────────────────────────────────────────────────────────────

export async function handleStock(fetcher: Fetcher, input: StockInput): Promise<StockOutput> {
  const {
    symbol,
    timeframe = "1D",
    count = 300,
    output = ["data", "chart"],
    toDate,
    footprint = false,
    footprintBars = 4000,
    sma = 20,
    volumeMA = 30,
    cvdTimeframe = "188",
    cvdBars = 188,
    cvdAnchor = "12M",
    cvdCustomTF,
    cvdResolution = "30S",
    savePath,
    width = 1200,
    height = 1000,
    theme = "dark",
    paneRatios = [0.65, 0.14, 0.21],
    panelWeights = [76, 24],
  } = input;

  const wantData = output.includes("data");
  const wantChart = output.includes("chart");

  // Calculate fetch counts (overshoot for toDate)
  const fetchBars1 = toDate ? barsNeededForDate(toDate, timeframe, count) : count;
  const fetchBars2 = toDate ? barsNeededForDate(toDate, cvdTimeframe, cvdBars) : cvdBars;

  // Auto-escalate CVD resolution for historical dates
  const effectiveCvdResolution = getHistoricalCvdResolution(toDate, cvdResolution, cvdBars, cvdTimeframe);

  // ─── Kick off footprint fetch in parallel (via central service) ─────────────
  const fpPromise = footprint
    ? footprintService.fetchDaily(symbol, { bars: Math.min(footprintBars, 4000) })
    : Promise.resolve(null);

  // ─── Single batch fetch: 2 panels, 1 WS call ───────────────────────────────
  await fetcher.setupBatch([
    { timeframe, count: fetchBars1, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: false } },
    { timeframe: cvdTimeframe, count: fetchBars2, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: cvdCustomTF ?? true, timeframe: effectiveCvdResolution } },
  ]);

  const [r, fpResult] = await Promise.all([fetcher.fetchNext(symbol), fpPromise]);

  // ─── Extract raw data from both panels ──────────────────────────────────────
  let bars1: Bar[] = r.panels[0].bars;
  let bars2: ChartBar[] = r.panels[1].bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  let cvd1 = filterSentinels(r.panels[0].cvd);
  let cvd2 = filterSentinels(r.panels[1].cvd);

  // ─── Trim to toDate ─────────────────────────────────────────────────────────
  if (toDate) {
    bars1 = trimBarsToDate(bars1, toDate);
    bars2 = trimBarsToDate(bars2, toDate);
    cvd1 = trimBarsToDate(cvd1, toDate);
    cvd2 = trimBarsToDate(cvd2, toDate);

    if (bars1.length > count) bars1 = bars1.slice(-count);
    if (bars2.length > cvdBars) bars2 = bars2.slice(-cvdBars);
    if (cvd1.length > count) cvd1 = cvd1.slice(-count);
    if (bars2.length > 0) {
      const startTs = bars2[0].t;
      cvd2 = cvd2.filter((d) => d.t >= startTs);
    }
    if (cvd2.length > cvdBars) cvd2 = cvd2.slice(-cvdBars);
  }

  const result: StockOutput = {};

  // ─── Data output ────────────────────────────────────────────────────────────
  if (wantData) {
    const computed = computeAll(bars1);

    // Convert cvd1/cvd2 to CVDPoint format for data output
    const cvdTop: CVDPoint[] = cvd1.map((d) => ({ t: d.t, o: d.o, h: d.h, l: d.l, c: d.c }));
    const cvdBottom: CVDPoint[] = cvd2.map((d) => ({ t: d.t, o: d.o, h: d.h, l: d.l, c: d.c }));

    // Filter footprint data to match the date range of bars1
    let fpDaily: FootprintDaily[] | null = null;
    if (fpResult && fpResult.length > 0) {
      const fromDate = bars1[0] ? new Date(bars1[0].t * 1000).toISOString().split("T")[0] : null;
      const toDateStr = bars1.at(-1) ? new Date(bars1.at(-1)!.t * 1000).toISOString().split("T")[0] : null;
      if (fromDate && toDateStr) {
        fpDaily = fpResult.filter(d => d.date >= fromDate && d.date <= toDateStr);
      } else {
        fpDaily = fpResult;
      }
    }

    result.data = {
      symbol: r.meta?.fullName || symbol,
      meta: r.meta ? {
        name: r.meta.name,
        exchange: r.meta.exchange,
        description: r.meta.description,
        type: r.meta.type,
      } : null,
      timeframe,
      dateRange: {
        from: bars1[0] ? new Date(bars1[0].t * 1000).toISOString().split("T")[0] : null,
        to: bars1.at(-1) ? new Date(bars1.at(-1)!.t * 1000).toISOString().split("T")[0] : null,
      },
      bars: bars1,
      indicators: computed.indicators,
      metrics: computed.metrics,
      cvd: cvdTop.length > 0 ? cvdTop : null,
      cvdBottom: cvdBottom.length > 0 ? cvdBottom : null,
      footprint: fpDaily && fpDaily.length > 0 ? fpDaily : null,
    };
  }

  // ─── Chart output ───────────────────────────────────────────────────────────
  if (wantChart) {
    const chartBars1: ChartBar[] = bars1.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));

    const panel1: PanelRequest = {
      bars: chartBars1,
      cvd: cvd1,
      volume: true,
      volumeMA,
      cvdColor: { up: "#26a69a", down: "#ef5350" },
      timeframeLabel: timeframe,
    };
    if (sma > 0) {
      panel1.sma = computeSMA(chartBars1, sma);
      panel1.smaPeriod = sma;
    }

    const panel2: PanelRequest = {
      bars: bars2,
      cvd: cvd2,
      volume: false,
      cvdColor: { up: "#26a69a", down: "#ef5350" },
      timeframeLabel: `${cvdTimeframe}min`,
    };

    const compositeReq: CompositeRequest = {
      symbol,
      description: r.meta?.description || undefined,
      exchange: r.meta?.exchange || "NSE",
      panels: [panel1, panel2],
      weights: panelWeights,
      options: { width, height, theme, paneRatios },
    };

    const chart = getChartClient();
    const image = await chart.renderComposite(compositeReq);

    const outDir = savePath && (savePath.endsWith("/") || !extname(savePath)) ? savePath : DEFAULT_CHART_DIR;
    await mkdir(outDir, { recursive: true });

    const lastBarTs = bars1.at(-1)?.t ?? Math.floor(Date.now() / 1000);
    const outPath = resolveSavePath(savePath, symbol, timeframe, lastBarTs);
    await Bun.write(outPath, image);

    result.chart = { path: outPath, image };
  }

  return result;
}

// ─── Standalone test ─────────────────────────────────────────────────────────

if (import.meta.main) {
  const { createFetcher } = await import("../services/fetcher");
  const fetcher = createFetcher();

  console.log("tv_stock standalone test\n");
  console.log("─── Test 1: output=['data'] (data only) ───");
  const t0 = performance.now();
  const r1 = await handleStock(fetcher, { symbol: "RELIANCE", count: 50, output: ["data"] });
  console.log(`  ✅ ${(performance.now() - t0).toFixed(0)}ms`);
  console.log(`  symbol: ${r1.data?.symbol}`);
  console.log(`  bars: ${r1.data?.bars.length}`);
  console.log(`  dateRange: ${r1.data?.dateRange.from} → ${r1.data?.dateRange.to}`);
  console.log(`  cvd (top): ${r1.data?.cvd?.length ?? 0} points`);
  console.log(`  cvd (bottom): ${r1.data?.cvdBottom?.length ?? 0} points`);
  console.log(`  metrics.close: ${r1.data?.metrics.close}`);
  console.log(`  chart: ${r1.chart ? r1.chart.path : "not requested"}`);

  console.log("\n─── Test 2: output=['data','chart'] (both, default) ───");
  const t1 = performance.now();
  const r2 = await handleStock(fetcher, { symbol: "RELIANCE", count: 50 });
  console.log(`  ✅ ${(performance.now() - t1).toFixed(0)}ms`);
  console.log(`  bars: ${r2.data?.bars.length}`);
  console.log(`  cvd (top): ${r2.data?.cvd?.length ?? 0} points`);
  console.log(`  cvd (bottom): ${r2.data?.cvdBottom?.length ?? 0} points`);
  console.log(`  chart path: ${r2.chart?.path ?? "none"}`);
  console.log(`  chart size: ${r2.chart?.image ? (r2.chart.image.length / 1024).toFixed(0) + " KB" : "none"}`);

  console.log("\n─── Test 3: output=['chart'] (chart only) ───");
  const t2 = performance.now();
  const r3 = await handleStock(fetcher, { symbol: "TCS", count: 50, output: ["chart"] });
  console.log(`  ✅ ${(performance.now() - t2).toFixed(0)}ms`);
  console.log(`  data: ${r3.data ? "present" : "not requested"}`);
  console.log(`  chart path: ${r3.chart?.path ?? "none"}`);

  fetcher.close();
  closeStock();
  console.log("\n✅ All tests passed");
}
