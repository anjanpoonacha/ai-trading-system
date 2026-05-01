/**
 * Default chart generation configurations.
 *
 * A CompositePreset defines a stacked multi-chart image (like TradingView's multi-chart layout).
 * Each panel has its own timeframe, indicators, and CVD config.
 */

import type { CVDConfig } from "../types";
import type { ChartOptions } from "./types";

export interface PanelPreset {
  timeframe: string;
  bars: number;
  sma?: number;
  volume: boolean;
  cvd: CVDConfig;
  cvdColor: { up: string; down: string };
  /** Relative height weight (panels are sized proportionally) */
  weight: number;
}

export interface CompositePreset {
  panels: PanelPreset[];
  options: ChartOptions;
}

/**
 * Default composite chart:
 *
 * Top panel (70%): 1D candles + SMA20 + volume + CVD(12M, false)
 * Bottom panel (30%): 188-minute CVD(12M, true, 30S)
 */
export const DEFAULT_CHART: CompositePreset = {
  panels: [
    {
      timeframe: "1D",
      bars: 188,
      sma: 20,
      volume: true,
      cvd: { anchorPeriod: "12M", useCustomTimeframe: false },
      cvdColor: { up: "#26a69a", down: "#ef5350" },
      weight: 76,
    },
    {
      timeframe: "188",
      bars: 188,
      volume: false,
      cvd: { anchorPeriod: "12M", useCustomTimeframe: true, timeframe: "30S" },
      cvdColor: { up: "#26a69a", down: "#ef5350" },
      weight: 24,
    },
  ],
  options: {
    width: 1200,
    height: 1000,
    theme: "dark",
    // Pane ratios within top chart: [candles, volume, cvd]
    // Volume 30% smaller, CVD 20% smaller than equal thirds → more space to candles
    paneRatios: [0.65, 0.14, 0.21],
  },
};

export const presets = { DEFAULT_CHART } as const;
