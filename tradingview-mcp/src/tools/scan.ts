/**
 * tv_scan tool — snapshot data for multiple symbols via Scanner API
 */

import type { Fetcher } from "../services/fetcher";

const DEFAULT_COLUMNS = [
  "name", "description", "close", "change", "volume",
  "SMA10", "SMA20", "SMA50", "SMA200",
  "EMA20", "EMA50", "EMA200",
  "average_volume_10d_calc", "average_volume_30d_calc",
  "relative_volume_10d_calc", "Value.Traded",
  "RSI", "ATR", "Volatility.D",
  "price_52_week_high", "price_52_week_low",
  "Perf.W", "Perf.1M", "Perf.3M",
  "market_cap_basic", "sector", "industry",
  "Recommend.All",
];

export interface ScanInput {
  symbols: string[];
  columns?: string[];
}

export async function handleScan(fetcher: Fetcher, input: ScanInput) {
  const columns = input.columns || DEFAULT_COLUMNS;
  const results = await fetcher.scan(input.symbols, columns);
  return results;
}
