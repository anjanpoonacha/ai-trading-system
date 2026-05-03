/**
 * Compute Service — Pure math functions on OHLCV bars
 *
 * No network, no state. All functions are pure: bars in → numbers out.
 *
 * Run standalone: bun src/services/compute.ts
 */

import type { Bar, CVDPoint } from "../types";

/** Simple Moving Average */
export function sma(bars: Bar[], period: number, field: "c" | "v" = "c"): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j][field];
    result.push(sum / period);
  }
  return result;
}

/** Exponential Moving Average */
export function ema(bars: Bar[], period: number, field: "c" | "v" = "c"): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let prev: number | null = null;

  for (let i = 0; i < bars.length; i++) {
    if (i < period - 1) { result.push(null); continue; }
    if (prev === null) {
      // First EMA value = SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += bars[j][field];
      prev = sum / period;
    } else {
      prev = bars[i][field] * k + prev * (1 - k);
    }
    result.push(prev);
  }
  return result;
}

/** Volume average (SMA of volume) */
export function volumeAvg(bars: Bar[], period: number): (number | null)[] {
  return sma(bars, period, "v");
}

/** Slope of a series over a window (% change per bar) */
export function slope(series: (number | null)[], window: number): number | null {
  const valid = series.filter((v): v is number => v !== null);
  if (valid.length < window) return null;
  const recent = valid.slice(-window);
  const first = recent[0];
  const last = recent[recent.length - 1];
  if (first === 0) return null;
  return ((last - first) / first) * 100 / window; // % per bar
}

/** Slope as % per week (for daily bars, 1 week = 5 bars) */
export function slopePerWeek(series: (number | null)[], window: number): number | null {
  const s = slope(series, window);
  return s !== null ? s * 5 : null;
}

/** Volume contraction: how much current volume is below average */
export function volumeContraction(bars: Bar[], avgPeriod: number, lookback = 5): number | null {
  if (bars.length < avgPeriod) return null;
  const avgVol = sma(bars, avgPeriod, "v");
  const currentAvg = avgVol.at(-1);
  if (!currentAvg) return null;

  // Average of last N bars volume
  const recentBars = bars.slice(-lookback);
  const recentAvg = recentBars.reduce((s, b) => s + b.v, 0) / recentBars.length;

  return ((1 - recentAvg / currentAvg) * 100);
}

/** Base depth: (highest high - lowest low) / highest high over last N bars, as % */
export function baseDepth(bars: Bar[], lookback: number): number | null {
  if (bars.length < lookback) return null;
  const recent = bars.slice(-lookback);
  const high = Math.max(...recent.map(b => b.h));
  const low = Math.min(...recent.map(b => b.l));
  return ((high - low) / high) * 100;
}

/** TRP: Tight Range Percentage — average (high-low)/close over last N bars */
export function trp(bars: Bar[], period = 5): number | null {
  if (bars.length < period) return null;
  const recent = bars.slice(-period);
  const avg = recent.reduce((s, b) => s + (b.h - b.l) / b.c, 0) / period;
  return avg * 100;
}

/** ADT: Average Daily Turnover in Crores */
export function adt(bars: Bar[], period = 20): number | null {
  if (bars.length < period) return null;
  const recent = bars.slice(-period);
  const avg = recent.reduce((s, b) => s + b.c * b.v, 0) / period;
  return avg / 1e7; // convert to Cr
}

/** Price vs SMA as percentage: ((close - sma) / sma) * 100 */
export function priceVsSma(close: number, smaValue: number | null): number | null {
  if (smaValue === null || smaValue === 0) return null;
  return ((close - smaValue) / smaValue) * 100;
}

/** Relative volume: current volume / avg volume */
export function relativeVolume(currentVol: number, avgVol: number | null): number | null {
  if (!avgVol || avgVol === 0) return null;
  return currentVol / avgVol;
}

/** Compute all standard metrics for a bar series */
export function computeAll(bars: Bar[]) {
  const sma10 = sma(bars, 10);
  const sma20 = sma(bars, 20);
  const sma50 = sma(bars, 50);
  const sma200 = sma(bars, 200);
  const ema10 = ema(bars, 10);
  const ema20 = ema(bars, 20);
  const ema50 = ema(bars, 50);
  const ema200 = ema(bars, 200);
  const volAvg20 = volumeAvg(bars, 20);
  const volAvg50 = volumeAvg(bars, 50);

  const lastBar = bars.at(-1);
  const close = lastBar?.c ?? 0;
  const vol = lastBar?.v ?? 0;

  return {
    indicators: { sma10, sma20, sma50, sma200, ema10, ema20, ema50, ema200, volAvg20, volAvg50 },
    metrics: {
      close,
      sma200Slope: slopePerWeek(sma200, 20),
      sma50Slope: slopePerWeek(sma50, 20),
      volumeContraction: volumeContraction(bars, 50),
      baseDepth: baseDepth(bars, 30),
      trp: trp(bars, 5),
      adtCr: adt(bars, 20),
      priceVs200: priceVsSma(close, sma200.at(-1) ?? null),
      priceVs50: priceVsSma(close, sma50.at(-1) ?? null),
      relativeVolume: relativeVolume(vol, volAvg20.at(-1) ?? null),
      currentSma10: sma10.at(-1),
      currentSma20: sma20.at(-1),
      currentSma50: sma50.at(-1),
      currentSma200: sma200.at(-1),
      currentEma20: ema20.at(-1),
      currentEma50: ema50.at(-1),
    },
  };
}

// ─── CVD Analysis ───────────────────────────────────────────────────────────

export interface CVDHealth {
  /** Cum CVD close on the evaluation bar */
  cumClose: number;
  /** Highest cum CVD close in the lookback */
  peakClose: number;
  /** Deficit: cumClose - peakClose (negative = below peak) */
  deficit: number;
  /** How many bars since peak close was set */
  barsSincePeak: number;
  /** CVD retention: daily cvd close / daily cvd high on the last bar (0-1, negative = all buying absorbed) */
  retention: number;
  /** Average retention over last N thrust days (days where cvd.h > 0) */
  avgRetention: number;
  /** Whether cum CVD is accelerating (last close > prior close AND > close 3 bars ago) */
  accelerating: boolean;
  /** Signal: "confirmed" | "suspect" | "exhausted" */
  signal: "confirmed" | "suspect" | "exhausted";
}

/**
 * Evaluate CVD health for a CDS setup.
 *
 * Rules (derived from GRSE Nov 2025 failure analysis):
 * - "confirmed": cum CVD close at peak OR peak within last 2 bars, retention > 0.7
 * - "suspect": peak 3-6 bars ago OR deficit > 1x avg daily range OR retention 0.3-0.7
 * - "exhausted": peak > 6 bars ago AND deficit > 1.5x avg daily range, OR retention < 0
 *               OR 2+ consecutive bars where intraday high > prior close but close < prior close
 */
export function cvdHealth(cvd: CVDPoint[], lookback = 20): CVDHealth | null {
  if (cvd.length < 3) return null;

  const window = cvd.slice(-lookback);
  const last = window[window.length - 1];

  // Build cumulative closes
  let cum = 0;
  let peakCum = 0;
  let peakIdx = 0;
  const cumCloses: number[] = [];

  for (let i = 0; i < window.length; i++) {
    cum += window[i].c;
    cumCloses.push(cum);
    if (cum > peakCum) {
      peakCum = cum;
      peakIdx = i;
    }
  }

  const cumClose = cumCloses[cumCloses.length - 1];
  const deficit = cumClose - peakCum;
  const barsSincePeak = window.length - 1 - peakIdx;

  // Daily retention on last bar
  const retention = last.h > 0 ? last.c / last.h : (last.c < 0 ? -1 : 0);

  // Average retention over recent thrust days (cvd.h > 0)
  const thrustDays = window.filter(d => d.h > 0).slice(-5);
  const avgRetention = thrustDays.length > 0
    ? thrustDays.reduce((s, d) => s + d.c / d.h, 0) / thrustDays.length
    : 0;

  // Average daily CVD range for deficit normalization
  const avgRange = window.reduce((s, d) => s + (d.h - d.l), 0) / window.length;

  // Acceleration: last cum close > prior AND > 3 bars ago
  const acc = cumCloses.length >= 4 &&
    cumCloses.at(-1)! > cumCloses.at(-2)! &&
    cumCloses.at(-1)! > cumCloses.at(-4)!;

  // Classify signal
  let signal: CVDHealth["signal"];
  const deficitRatio = avgRange > 0 ? Math.abs(deficit) / avgRange : 0;

  if (retention < 0 || (barsSincePeak > 6 && deficitRatio > 1.5)) {
    signal = "exhausted";
  } else if (barsSincePeak <= 2 && retention >= 0.7 && deficitRatio < 0.5) {
    signal = "confirmed";
  } else {
    signal = "suspect";
  }

  return { cumClose, peakClose: peakCum, deficit, barsSincePeak, retention, avgRetention, accelerating: acc, signal };
}

/**
 * Reference case: GRSE Nov 2025 failure pattern.
 *
 * Dates: 2025-11-10 to 2025-12-02 (symbol NSE:GRSE)
 *
 * Phase 1 — Impulse (Nov 10-14):
 *   Retention 85-100%, cum CVD at new ATH every bar. Pure demand.
 *
 * Phase 2 — Distribution (Nov 17-24):
 *   Nov 17: retention 3% (473K high → 13K close). First signal.
 *   Nov 20: new ATH close (27.10M) but retention only 55%.
 *   Nov 21-24: cum CVD drops -897K from peak while price falls to SMA20.
 *
 * Phase 3 — Failed CDS (Nov 26-28):
 *   Nov 26: CDS signal triggered (price at SMA20, vol contracted).
 *   Cum CVD close: 26.53M — deficit of -570K from Nov 20 peak.
 *   Nov 27: retention 64%, price hit 2867 but cum CVD close only 26.76M (still -341K below peak).
 *   Nov 28: retention NEGATIVE (-20%), cum CVD close 26.71M (LOWER than Nov 27).
 *   → cvdHealth would classify as "suspect" on Nov 26, "exhausted" by Nov 28.
 *
 * Outcome: Dec 1-2 crashed from 2793 → 2608 (-6.6%).
 *
 * Key lesson: "CVD at all-time highs" (absolute level) ≠ "CVD still accelerating" (trajectory).
 * The correct check is cum CVD CLOSE vs its own recent peak, not the absolute number.
 */
export const CVD_REFERENCE_CASES = {
  GRSE_NOV2025: {
    symbol: "NSE:GRSE",
    setupDate: "2025-11-26",
    failureDate: "2025-12-01",
    peakCumCvdClose: { value: 27.10e6, date: "2025-11-20" },
    atSetup: { cumCvdClose: 26.53e6, deficit: -570e3, barsSincePeak: 4, retention: 0.93 },
    atEntry: { cumCvdClose: 26.76e6, deficit: -341e3, barsSincePeak: 5, retention: 0.64, date: "2025-11-27" },
    atFailure: { cumCvdClose: 26.71e6, deficit: -388e3, barsSincePeak: 6, retention: -0.20, date: "2025-11-28" },
    lesson: "Peak cum CVD close was 6 bars before CDS entry. Deficit > 1x avg daily range. Retention degraded from 100% (impulse) to negative (distribution). Setup was 'suspect' at signal, 'exhausted' by next bar.",
  },
} as const;

// --- Standalone test ---
if (import.meta.main) {
  // Generate fake bars for testing
  const fakeBars: Bar[] = [];
  let price = 1000;
  for (let i = 0; i < 300; i++) {
    const change = (Math.random() - 0.48) * 20;
    price += change;
    fakeBars.push({
      t: 1700000000 + i * 86400,
      o: price - 5,
      h: price + 10,
      l: price - 10,
      c: price,
      v: 5000000 + Math.random() * 10000000,
    });
  }

  console.log("Compute service test (300 synthetic bars)\n");
  const result = computeAll(fakeBars);

  console.log("Metrics:");
  for (const [key, value] of Object.entries(result.metrics)) {
    console.log(`  ${key.padEnd(20)} ${typeof value === "number" ? value.toFixed(2) : value}`);
  }

  console.log(`\nIndicator lengths:`);
  for (const [key, arr] of Object.entries(result.indicators)) {
    const nonNull = arr.filter(v => v !== null).length;
    console.log(`  ${key.padEnd(10)} ${nonNull}/${arr.length} values`);
  }

  console.log("\n✅ Compute tests passed");
}
