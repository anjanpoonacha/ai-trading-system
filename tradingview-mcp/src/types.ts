export interface Bar {
  t: number;  // unix timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close
  v: number;  // volume
}

export interface SymbolMeta {
  name: string;
  fullName: string;
  exchange: string;
  type: string;
  description: string;
  pricescale: number;
  currencyCode: string;
  session: string;
  timezone: string;
}

export interface CVDPoint {
  t: number;  // timestamp
  o: number;  // open
  h: number;  // high
  l: number;  // low
  c: number;  // close (this is the CVD value)
}

export interface ScanResult {
  symbol: string;
  data: Record<string, unknown>;
}

export type Timeframe = "1" | "5" | "15" | "30" | "60" | "1D" | "1W" | "1M";

/**
 * CVD indicator configuration (matches TradingView's 3 inputs).
 *
 * - anchorPeriod: Reset period for cumulative delta. e.g. "12M", "1M", "1W", "1D"
 * - useCustomTimeframe: If true, aggregate delta at a custom resolution
 * - timeframe: Custom resolution (only used when useCustomTimeframe=true). e.g. "30S", "1", "5"
 */
export interface CVDConfig {
  anchorPeriod?: string;        // default "12M" (12 months)
  useCustomTimeframe?: boolean; // default false
  timeframe?: string;           // default "30S" (30 seconds), only active when useCustomTimeframe=true
}

// ─── Footprint types ─────────────────────────────────────────────────────────

export interface FootprintLevel {
  buyVolume: number;
  sellVolume: number;
  imbalance: string;  // "buy" | "sell" | ""
  price: number;
}

export interface FootprintBar {
  id: number;
  tf: string;       // "S" = tick, "1" = 1min, "60" = 60min
  index: number;
  poc: number;
  val: number;      // value area low
  vah: number;      // value area high
  levels: FootprintLevel[];
}

/** Daily aggregated footprint data */
export interface FootprintDaily {
  date: string;     // YYYY-MM-DD
  fp_buy_vol: number;
  fp_sell_vol: number;
  fp_delta: number;       // buy - sell
  fp_total_vol: number;   // buy + sell
}
