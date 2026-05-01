/**
 * tv_chart tool — generates a composite chart image for a symbol.
 *
 * Fetches data from TradingView, renders a multi-panel chart:
 *   Top: candles + SMA + volume + CVD (daily)
 *   Bottom: CVD at intraday resolution (188min/30s)
 *
 * All settings are configurable with sensible defaults.
 */

import { resolve, basename, extname } from "path";
import { mkdir } from "fs/promises";
import type { Fetcher } from "../services/fetcher";
import { createChartClient, type ChartClient } from "../chart/client";
import { DEFAULT_CHART } from "../chart/defaults";
import type { ChartBar, CVDBar, PanelRequest, CompositeRequest } from "../chart/types";
import type { CVDConfig } from "../types";

const DEFAULT_CHART_DIR = "/tmp/charts";

export interface ChartToolInput {
  symbol: string;

  // Panel 1 (top chart) settings
  timeframe?: string;         // default "1D"
  bars?: number;              // default 188
  sma?: number;               // default 20 (0 to disable)

  // Panel 2 (bottom CVD chart) settings
  cvdTimeframe?: string;      // default "188" (188 minutes)
  cvdBars?: number;           // default 188

  // CVD indicator config (applies to both panels)
  cvdAnchor?: string;         // default "12M"
  cvdCustomTF?: boolean;      // default false for panel 1, true for panel 2
  cvdResolution?: string;     // default "30S" (for panel 2 when cvdCustomTF=true)

  // Output
  /** Save path. Folder → auto-generates filename. Full path → uses as-is. Default: /tmp/charts/{SYMBOL}-{TF}-{DATE}.png */
  savePath?: string;

  // Layout
  width?: number;             // default 1200
  height?: number;            // default 1000
  theme?: "dark" | "light";   // default "dark"
  /** Pane ratios within top chart: [candles, volume, cvd]. Default [0.65, 0.14, 0.21] */
  paneRatios?: [number, number, number];
  /** Panel weight ratio [top, bottom]. Default [76, 24] */
  panelWeights?: [number, number];
}

/**
 * Resolve the save path for a chart image.
 * - Not specified → /tmp/charts/RELIANCE-1D-2025-01-01.png
 * - Folder only (ends with /) → folder/RELIANCE-1D-2025-01-01.png
 * - Full path → as-is
 */
function resolveSavePath(input: string | undefined, symbol: string, timeframe: string, lastBarTimestamp: number): string {
  const date = new Date(lastBarTimestamp * 1000).toISOString().split("T")[0];
  const defaultFilename = `${symbol.toUpperCase()}-${timeframe}-${date}.png`;

  if (!input) {
    return resolve(DEFAULT_CHART_DIR, defaultFilename);
  }

  // If path ends with / or has no extension → treat as folder
  if (input.endsWith("/") || !extname(input)) {
    return resolve(input, defaultFilename);
  }

  return resolve(input);
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

export async function handleChart(fetcher: Fetcher, input: ChartToolInput): Promise<{
  image: Buffer;
  mimeType: "image/png";
  path: string;
  symbol: string;
  meta: any;
}> {
  const {
    symbol,
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

  // Panel 1: main chart (candles + sma + volume + CVD at chart timeframe)
  const panel1Cvd: CVDConfig = { anchorPeriod: cvdAnchor, useCustomTimeframe: false };
  const { bars: rawBars1, meta, cvd: rawCvd1 } = await fetcher.getBarsWithCVD(
    symbol, timeframe, barCount, panel1Cvd,
  );
  const bars1: ChartBar[] = rawBars1.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  const cvd1 = filterSentinels(rawCvd1);

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

  // Panel 2: CVD-only at intraday timeframe
  const panel2Cvd: CVDConfig = {
    anchorPeriod: cvdAnchor,
    useCustomTimeframe: cvdCustomTF ?? true,
    timeframe: cvdResolution,
  };
  const { bars: rawBars2, cvd: rawCvd2 } = await fetcher.getBarsWithCVD(
    symbol, cvdTimeframe, cvdBars, panel2Cvd,
  );
  const bars2: ChartBar[] = rawBars2.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
  const cvd2 = filterSentinels(rawCvd2);

  const panel2: PanelRequest = {
    bars: bars2,
    cvd: cvd2,
    volume: false,
    cvdColor: { up: "#26a69a", down: "#ef5350" },
    timeframeLabel: `${cvdTimeframe}min`,
  };

  // Render composite
  const compositeReq: CompositeRequest = {
    symbol,
    description: meta?.description || undefined,
    exchange: meta?.exchange || "NSE",
    panels: [panel1, panel2],
    weights: panelWeights,
    options: { width, height, theme, paneRatios },
  };

  const image = await chart.renderComposite(compositeReq);

  // Resolve save path using top panel's last bar date
  const lastBarTs = bars1.at(-1)?.t ?? Math.floor(Date.now() / 1000);
  const outPath = resolveSavePath(savePath, symbol, timeframe, lastBarTs);

  // Ensure directory exists and write
  await mkdir(resolve(outPath, ".."), { recursive: true });
  await Bun.write(outPath, image);

  return {
    image,
    mimeType: "image/png",
    path: outPath,
    symbol: meta?.fullName || symbol,
    meta,
  };
}

/** Cleanup — call on server shutdown */
export function closeChart() {
  sharedClient?.close();
  sharedClient = null;
}
