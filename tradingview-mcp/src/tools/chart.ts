/**
 * tv_chart tool — generates composite chart images for NSE stocks.
 *
 * Supports single symbol or batch (array). Uses dual-session batch API
 * for efficient parallel panel fetching with persistent studies.
 *
 * Each chart: 1D candles + SMA + volume + CVD (top), 188min CVD (bottom).
 */

import { resolve, extname } from "path";
import { mkdir } from "fs/promises";
import type { Fetcher } from "../services/fetcher";
import { createChartClient, type ChartClient } from "../chart/client";
import type { ChartBar, CVDBar, PanelRequest, CompositeRequest } from "../chart/types";
import type { CVDConfig } from "../types";

const DEFAULT_CHART_DIR = "/tmp/charts";

export interface ChartToolInput {
  /** Single symbol or array of symbols */
  symbols: string[];

  // Panel 1 (top chart) settings
  timeframe?: string;         // default "1D"
  bars?: number;              // default 188
  sma?: number;               // default 20 (0 to disable)
  volumeMA?: number;          // default 30 (0 to disable)

  // Panel 2 (bottom CVD chart) settings
  cvdTimeframe?: string;      // default "188" (188 minutes)
  cvdBars?: number;           // default 188

  // CVD indicator config
  cvdAnchor?: string;         // default "12M"
  cvdCustomTF?: boolean;      // default true for panel 2
  cvdResolution?: string;     // default "30S"

  // Date range
  /** End date for the chart (YYYY-MM-DD). Fetches enough bars to reach this date, then trims. Default: latest available. */
  toDate?: string;

  // Output
  savePath?: string;          // folder or full path. Default: /tmp/charts/

  // Layout
  width?: number;             // default 1200
  height?: number;            // default 1000
  theme?: "dark" | "light";   // default "dark"
  paneRatios?: [number, number, number];  // default [0.65, 0.14, 0.21]
  panelWeights?: [number, number];        // default [76, 24]
}

export interface ChartResult {
  symbol: string;
  path: string;
  image?: Buffer;
  ok: boolean;
  error?: string;
}

export interface ChartToolOutput {
  results: ChartResult[];
  stats: { total: number; ok: number; failed: number; totalMs: number; avgMs: number };
}

/**
 * Calculate how many bars to request to cover history back to a target date.
 * Overshoots by 20% to account for holidays/weekends.
 */
function barsNeededForDate(toDate: string, timeframe: string, desiredBars: number): number {
  const targetTs = new Date(toDate).getTime();
  const nowTs = Date.now();
  const diffMs = nowTs - targetTs;

  if (diffMs <= 0) return desiredBars; // future or today — use default

  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  let barsFromNow: number;
  switch (timeframe) {
    case "1D": barsFromNow = Math.ceil(diffDays * 5 / 7); break; // trading days ~5/7
    case "1W": barsFromNow = Math.ceil(diffDays / 7); break;
    case "1M": barsFromNow = Math.ceil(diffDays / 30); break;
    default: {
      // Intraday: timeframe is in minutes
      const minutes = parseInt(timeframe) || 1;
      const tradingMinutesPerDay = 375; // NSE: 9:15 - 15:30
      barsFromNow = Math.ceil((diffDays * 5 / 7) * tradingMinutesPerDay / minutes);
      break;
    }
  }

  // We need: bars from now to toDate + the desired chart bars before toDate
  const total = barsFromNow + desiredBars;
  return Math.ceil(total * 1.2); // 20% overshoot for safety
}

/**
 * Trim bars to only include data up to a target date.
 */
function trimBarsToDate(bars: { t: number }[], toDateStr: string): void {
  const targetTs = Math.floor(new Date(toDateStr + "T23:59:59Z").getTime() / 1000);
  // Find the last bar at or before targetTs and remove everything after
  const cutIdx = bars.findIndex((b) => b.t > targetTs);
  if (cutIdx > 0) bars.splice(cutIdx);
}

function resolveSavePath(folder: string | undefined, symbol: string, timeframe: string, lastBarTs: number): string {
  const date = new Date(lastBarTs * 1000).toISOString().split("T")[0];
  const filename = `${symbol.toUpperCase()}-${timeframe}-${date}.png`;
  const dir = folder && (folder.endsWith("/") || !extname(folder)) ? folder : DEFAULT_CHART_DIR;
  return resolve(dir, filename);
}

/**
 * Auto-escalate CVD resolution for historical dates where fine-grained
 * data (30S) may not be available.
 *
 * Uses the oldest data point we'll fetch (not just toDate) to determine
 * whether fine-grained tick data is likely available.
 */
function getHistoricalCvdResolution(toDate: string | undefined, defaultResolution: string, desiredBars: number, timeframe: string): string {
  if (!toDate) return defaultResolution;

  // The oldest bar we need is: toDate minus (desiredBars * bar duration)
  const targetTs = new Date(toDate).getTime();
  const minutes = parseInt(timeframe) || 375; // intraday minutes, default to 1D equivalent
  const tradingMinutesPerDay = 375;
  const barsPerDay = tradingMinutesPerDay / minutes;
  const tradingDaysNeeded = desiredBars / barsPerDay;
  const calendarDaysNeeded = tradingDaysNeeded * 7 / 5; // convert to calendar days
  const oldestDataTs = targetTs - calendarDaysNeeded * 24 * 60 * 60 * 1000;

  const now = new Date();
  const monthsFromNow = (now.getFullYear() * 12 + now.getMonth()) - (new Date(oldestDataTs).getFullYear() * 12 + new Date(oldestDataTs).getMonth());

  if (monthsFromNow < 3) return defaultResolution;
  if (monthsFromNow < 6) return "1";    // 1 minute
  if (monthsFromNow < 12) return "5";   // 5 minutes
  if (monthsFromNow < 60) return "10";  // 10 minutes
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

let sharedClient: ChartClient | null = null;

function getChartClient(): ChartClient {
  if (!sharedClient) sharedClient = createChartClient();
  return sharedClient;
}

export async function handleChart(fetcher: Fetcher, input: ChartToolInput): Promise<ChartToolOutput> {
  const {
    symbols,
    timeframe = "1D",
    bars: barCount = 188,
    sma = 20,
    volumeMA = 30,
    cvdTimeframe = "188",
    cvdBars = 188,
    cvdAnchor = "12M",
    cvdCustomTF,
    cvdResolution = "30S",
    toDate,
    savePath,
    width = 1200,
    height = 1000,
    theme = "dark",
    paneRatios = [0.65, 0.14, 0.21],
    panelWeights = [76, 24],
  } = input;

  // If toDate specified, calculate how many bars to fetch to cover the range
  const fetchBars1 = toDate ? barsNeededForDate(toDate, timeframe, barCount) : barCount;
  const fetchBars2 = toDate ? barsNeededForDate(toDate, cvdTimeframe, cvdBars) : cvdBars;

  // Auto-escalate CVD resolution for historical dates
  const effectiveCvdResolution = getHistoricalCvdResolution(toDate, cvdResolution, cvdBars, cvdTimeframe);

  const chart = getChartClient();
  const results: ChartResult[] = [];
  const t0 = performance.now();

  // Setup batch: dual sessions with persistent studies
  await fetcher.setupBatch([
    { timeframe, count: fetchBars1, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: false } },
    { timeframe: cvdTimeframe, count: fetchBars2, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: cvdCustomTF ?? true, timeframe: effectiveCvdResolution } },
  ]);

  // Ensure output dir exists
  const outDir = savePath && (savePath.endsWith("/") || !extname(savePath)) ? savePath : DEFAULT_CHART_DIR;
  await mkdir(outDir, { recursive: true });

  // Process each symbol
  for (const symbol of symbols) {
    try {
      const r = await fetcher.fetchNext(symbol);

      const bars1: ChartBar[] = r.panels[0].bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      const bars2: ChartBar[] = r.panels[1].bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      let cvd1 = filterSentinels(r.panels[0].cvd);
      let cvd2 = filterSentinels(r.panels[1].cvd);

      // Trim to toDate if specified
      if (toDate) {
        // Remove bars AFTER toDate (right trim only)
        trimBarsToDate(bars1, toDate);
        trimBarsToDate(bars2, toDate);
        trimBarsToDate(cvd1, toDate);
        trimBarsToDate(cvd2, toDate);
        // Keep only last N bars (the chart window) — left trim
        if (bars1.length > barCount) bars1.splice(0, bars1.length - barCount);
        if (bars2.length > cvdBars) bars2.splice(0, bars2.length - cvdBars);
        if (cvd1.length > barCount) cvd1 = cvd1.slice(-barCount);
        // Align cvd2 to bars2 time range (not independently trimmed)
        if (bars2.length > 0) {
          const startTs = bars2[0].t;
          cvd2 = cvd2.filter((d) => d.t >= startTs);
        }
        if (cvd2.length > cvdBars) cvd2 = cvd2.slice(-cvdBars);
      }

      const panel1: PanelRequest = {
        bars: bars1,
        cvd: cvd1,
        volume: true,
        volumeMA,
        cvdColor: { up: "#26a69a", down: "#ef5350" },
        timeframeLabel: timeframe,
      };
      if (sma > 0) {
        panel1.sma = computeSMA(bars1, sma);
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

      const image = await chart.renderComposite(compositeReq);

      const lastBarTs = bars1.at(-1)?.t ?? Math.floor(Date.now() / 1000);
      const outPath = resolveSavePath(savePath, symbol, timeframe, lastBarTs);
      await Bun.write(outPath, image);

      results.push({ symbol, path: outPath, image, ok: true });
    } catch (err: any) {
      results.push({ symbol, path: "", ok: false, error: err.message });
    }
  }

  const totalMs = performance.now() - t0;
  const okCount = results.filter((r) => r.ok).length;

  return {
    results,
    stats: {
      total: symbols.length,
      ok: okCount,
      failed: symbols.length - okCount,
      totalMs: Math.round(totalMs),
      avgMs: Math.round(totalMs / symbols.length),
    },
  };
}

/** Cleanup — call on server shutdown */
export function closeChart() {
  sharedClient?.close();
  sharedClient = null;
}
