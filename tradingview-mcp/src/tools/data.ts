/**
 * tv_data tool — historical bars + computed indicators for a single symbol
 *
 * Transparent pipe: Fetcher → Compute → full output
 * No filtering, no opinions. Returns everything the primitives produce.
 */

import type { Fetcher } from "../services/fetcher";
import { computeAll } from "../services/compute";
import type { Bar, CVDPoint } from "../types";

export interface DataInput {
  symbol: string;
  timeframe?: string;
  count?: number;
  cvd?: boolean;
  /** End date (YYYY-MM-DD). Returns bars ending on this date instead of latest. */
  toDate?: string;
}

export interface DataOutput {
  symbol: string;
  meta: {
    name: string;
    exchange: string;
    description: string;
    type: string;
  } | null;
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
}

/**
 * Calculate how many bars to request to cover history back to a target date.
 * Overshoots by 20% to account for holidays/weekends.
 */
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

/**
 * Trim bars array to only include data up to a target date.
 */
function trimBarsToDate<T extends { t: number }>(arr: T[], toDateStr: string): T[] {
  const targetTs = Math.floor(new Date(toDateStr + "T23:59:59Z").getTime() / 1000);
  const cutIdx = arr.findIndex((b) => b.t > targetTs);
  if (cutIdx > 0) return arr.slice(0, cutIdx);
  return arr;
}

export async function handleData(fetcher: Fetcher, input: DataInput): Promise<DataOutput> {
  const symbol = input.symbol;
  const timeframe = input.timeframe || "1D";
  const count = input.count || 300;
  const wantCVD = input.cvd || false;
  const toDate = input.toDate;

  // If toDate specified, fetch enough bars to reach that date
  const fetchCount = toDate ? barsNeededForDate(toDate, timeframe, count) : count;

  // Fetch bars (+ CVD if requested)
  let bars: Bar[], meta, cvd: CVDPoint[] | null;
  if (wantCVD) {
    const result = await fetcher.getBarsWithCVD(symbol, timeframe, fetchCount);
    bars = result.bars;
    meta = result.meta;
    cvd = result.cvd;
  } else {
    const result = await fetcher.getBars(symbol, timeframe, fetchCount);
    bars = result.bars;
    meta = result.meta;
    cvd = null;
  }

  // Trim to toDate and keep last `count` bars
  if (toDate) {
    bars = trimBarsToDate(bars, toDate);
    if (cvd) cvd = trimBarsToDate(cvd, toDate);
    // Keep only the last `count` bars
    if (bars.length > count) bars = bars.slice(-count);
    if (cvd && cvd.length > count) cvd = cvd.slice(-count);
  }

  // Compute indicators from bars
  const computed = computeAll(bars);

  // Return everything — no filtering
  return {
    symbol: meta?.fullName || symbol,
    meta: meta ? {
      name: meta.name,
      exchange: meta.exchange,
      description: meta.description,
      type: meta.type,
    } : null,
    timeframe,
    dateRange: {
      from: bars[0] ? new Date(bars[0].t * 1000).toISOString().split("T")[0] : null,
      to: bars.at(-1) ? new Date(bars.at(-1)!.t * 1000).toISOString().split("T")[0] : null,
    },
    bars,
    indicators: computed.indicators,
    metrics: computed.metrics,
    cvd,
  };
}
