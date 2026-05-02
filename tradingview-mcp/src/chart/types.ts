/**
 * Chart module shared types.
 *
 * Compatible with the main types.ts (Bar, CVDPoint) but self-contained
 * so the chart module can be tested independently.
 */

export interface ChartBar {
  t: number; // unix timestamp (seconds)
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close
  v: number; // volume
}

export interface CVDBar {
  t: number; // timestamp
  o: number; // open
  h: number; // high
  l: number; // low
  c: number; // close (cumulative delta value)
}

export interface ChartRequest {
  bars: ChartBar[];
  cvd?: CVDBar[];
  sma?: (number | null)[];
  options?: ChartOptions;
}

export interface ChartOptions {
  width?: number;           // default 800
  height?: number;          // default 600
  title?: string;           // e.g. "RELIANCE 1D"
  theme?: "dark" | "light";
  smaPeriod?: number;       // legend label, e.g. 20
  watermark?: string;       // faint center text
  cvdColor?: { up: string; down: string }; // default green/red
  /** Pane height ratios within the top chart [candles, volume, cvd]. Default [0.6, 0.15, 0.25] */
  paneRatios?: [number, number, number];
}

// --- Layer-based panel config ---

export type Layer =
  | { type: "candlestick"; data: ChartBar[]; pane?: number }
  | { type: "line"; data: (number | null)[]; color?: string; title?: string; pane?: number; lineWidth?: number }
  | { type: "volume"; data: ChartBar[]; pane?: number }
  | { type: "cvd"; data: CVDBar[]; color?: { up: string; down: string }; pane?: number };

export interface PanelSpec {
  layers: Layer[];
  width?: number;
  height?: number;
  theme?: "dark" | "light";
  timeframeLabel?: string;
}

/**
 * A single panel in a composite chart (legacy compat — maps to PanelSpec internally).
 */
export interface PanelRequest {
  bars: ChartBar[];
  cvd?: CVDBar[];
  sma?: (number | null)[];
  volume?: boolean;         // default true
  smaPeriod?: number;
  cvdColor?: { up: string; down: string };
  timeframeLabel?: string;  // e.g. "1D", "188min" — shown in panel header
}

/**
 * Composite chart request — multiple panels stacked vertically.
 */
export interface CompositeRequest {
  symbol: string;           // e.g. "RELIANCE"
  description?: string;     // e.g. "Reliance Industries Limited"
  exchange?: string;        // e.g. "NSE"
  panels: PanelRequest[];
  /** Height weight per panel (proportional). Must match panels.length */
  weights?: number[];
  options?: ChartOptions;
}

export interface ResponseHeader {
  ok: boolean;
  size?: number;   // bytes of PNG payload (when ok=true)
  error?: string;  // message (when ok=false)
}
