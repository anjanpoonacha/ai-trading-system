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

  // Panel 2 (bottom CVD chart) settings
  cvdTimeframe?: string;      // default "188" (188 minutes)
  cvdBars?: number;           // default 188

  // CVD indicator config
  cvdAnchor?: string;         // default "12M"
  cvdCustomTF?: boolean;      // default true for panel 2
  cvdResolution?: string;     // default "30S"

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
  ok: boolean;
  error?: string;
}

export interface ChartToolOutput {
  results: ChartResult[];
  stats: { total: number; ok: number; failed: number; totalMs: number; avgMs: number };
}

function resolveSavePath(folder: string | undefined, symbol: string, timeframe: string, lastBarTs: number): string {
  const date = new Date(lastBarTs * 1000).toISOString().split("T")[0];
  const filename = `${symbol.toUpperCase()}-${timeframe}-${date}.png`;
  const dir = folder && (folder.endsWith("/") || !extname(folder)) ? folder : DEFAULT_CHART_DIR;
  return resolve(dir, filename);
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

  const chart = getChartClient();
  const results: ChartResult[] = [];
  const t0 = performance.now();

  // Setup batch: dual sessions with persistent studies
  await fetcher.setupBatch([
    { timeframe, count: barCount, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: false } },
    { timeframe: cvdTimeframe, count: cvdBars, cvdConfig: { anchorPeriod: cvdAnchor, useCustomTimeframe: cvdCustomTF ?? true, timeframe: cvdResolution } },
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
      const cvd1 = filterSentinels(r.panels[0].cvd);
      const cvd2 = filterSentinels(r.panels[1].cvd);

      const panel1: PanelRequest = {
        bars: bars1,
        cvd: cvd1,
        volume: true,
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

      results.push({ symbol, path: outPath, ok: true });
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
