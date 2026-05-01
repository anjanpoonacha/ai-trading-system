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

export async function handleData(fetcher: Fetcher, input: DataInput): Promise<DataOutput> {
  const symbol = input.symbol;
  const timeframe = input.timeframe || "1D";
  const count = input.count || 300;
  const wantCVD = input.cvd || false;

  // Fetch bars (+ CVD if requested)
  let bars: Bar[], meta, cvd: CVDPoint[] | null;
  if (wantCVD) {
    const result = await fetcher.getBarsWithCVD(symbol, timeframe, count);
    bars = result.bars;
    meta = result.meta;
    cvd = result.cvd;
  } else {
    const result = await fetcher.getBars(symbol, timeframe, count);
    bars = result.bars;
    meta = result.meta;
    cvd = null;
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
