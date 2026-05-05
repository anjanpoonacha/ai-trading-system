/**
 * Footprint Service — central, decoupled footprint data provider
 *
 * Any tool can import the singleton and call:
 *   import { footprintService } from "../services/footprint";
 *   const daily = await footprintService.fetchDaily("NSE:RELIANCE");
 *
 * Uses the auth WebSocket (prodata), manages its own connection lifecycle,
 * queues requests, and caches results with configurable TTL.
 */

import { WebSocket } from "ws";
import type { Bar, FootprintBar, FootprintDaily } from "../types";
import {
  encodeFrame,
  parseFrame,
  genSessionId,
  msgSetAuth,
  msgCreateChartSession,
  msgResolveSymbol,
  msgCreateSeries,
  msgCreateFootprintStudy,
} from "../connection/protocol";
import { getAuthToken, hasAuth } from "../connection/auth";
import { AsyncQueue } from "../connection/queue";

const PRO_URL = "wss://prodata.tradingview.com/socket.io/websocket?from=chart/&type=chart";
const WS_HEADERS = {
  Origin: "https://www.tradingview.com",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

const DEFAULT_BARS = 4000;
const TIMEOUT_MS = 45_000;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min — FP doesn't change for historical bars

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FootprintFetchOptions {
  /** Number of 60-min bars to request (max 4000). More bars = more historical coverage. */
  bars?: number;
}

export interface FootprintService {
  /** Fetch daily aggregated footprint data for a symbol. Returns [] on failure/no-auth. */
  fetchDaily(symbol: string, opts?: FootprintFetchOptions): Promise<FootprintDaily[]>;
  /** Clear the cache for a symbol, or all if no symbol given. */
  clearCache(symbol?: string): void;
  /** Close any open WebSocket connection. */
  close(): void;
}

// ─── Cache ───────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: FootprintDaily[];
  fetchedAt: number;
}

// ─── Implementation ──────────────────────────────────────────────────────────

function createFootprintService(): FootprintService {
  const cache = new Map<string, CacheEntry>();
  const queue = new AsyncQueue();
  let ws: WebSocket | null = null;
  let wsReady = false;
  let symbolIndex = 0;

  function normalizeSymbol(sym: string): string {
    return sym.includes(":") ? sym : `NSE:${sym}`;
  }

  function getCacheKey(symbol: string, bars: number): string {
    return `${symbol}|${bars}`;
  }

  function getCached(symbol: string, bars: number): FootprintDaily[] | null {
    const entry = cache.get(getCacheKey(symbol, bars));
    if (!entry) return null;
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) {
      cache.delete(getCacheKey(symbol, bars));
      return null;
    }
    return entry.data;
  }

  function setCache(symbol: string, bars: number, data: FootprintDaily[]) {
    cache.set(getCacheKey(symbol, bars), { data, fetchedAt: Date.now() });
  }

  /**
   * Core fetch — opens a dedicated WS per request.
   * We open per-request because the FP study is heavy and locks the chart session.
   * The queue serializes these so we don't flood TV with concurrent connections.
   */
  async function doFetch(symbol: string, barCount: number): Promise<FootprintDaily[]> {
    const token = await getAuthToken();
    if (token === "unauthorized_user_token") {
      return []; // no auth — graceful empty
    }

    const chartSession = genSessionId("cs_");
    const resolveId = `fp_sym_${symbolIndex}`;
    const seriesId = "sds_1";
    const studyId = `fp_st_${symbolIndex}`;
    symbolIndex++;

    return new Promise<FootprintDaily[]>((resolve, reject) => {
      const conn = new WebSocket(PRO_URL, { headers: WS_HEADERS } as any);
      const timeout = setTimeout(() => {
        conn.close();
        reject(new Error(`Footprint timeout for ${symbol}`));
      }, TIMEOUT_MS);

      let sessionReady = false;
      let seriesCompleted = false;
      const ohlcvBars: Bar[] = [];
      let fpBars: FootprintBar[] | null = null;

      function send(msg: object) {
        conn.send(encodeFrame(msg));
      }

      function cleanup() {
        clearTimeout(timeout);
        conn.close();
      }

      conn.on("message", (raw: Buffer) => {
        const frames = parseFrame(raw.toString());
        for (const frame of frames) {
          if (frame.type === "heartbeat") {
            conn.send(frame.raw);
            continue;
          }
          if (frame.type === "session" && !sessionReady) {
            sessionReady = true;
            send(msgSetAuth(token));
            send(msgCreateChartSession(chartSession));
            send(msgResolveSymbol(chartSession, resolveId, symbol));
            send(msgCreateSeries(chartSession, seriesId, "s0", resolveId, "60", barCount));
            continue;
          }
          if (frame.type === "message") {
            handleMessage(frame.data);
          }
        }
      });

      function handleMessage(msg: { m: string; p: unknown[] }) {
        // Collect OHLCV bars
        if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.[seriesId]?.s) {
          for (const c of (msg.p[1] as any)[seriesId].s) {
            const v = c.v;
            if (v && v.length >= 6) {
              ohlcvBars.push({ t: v[0], o: v[1], h: v[2], l: v[3], c: v[4], v: v[5] });
            }
          }
        }

        // Footprint data arrives in ns.d
        if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.[studyId]?.ns?.d) {
          try {
            const nsData = JSON.parse((msg.p[1] as any)[studyId].ns.d);
            if (nsData.graphicsCmds?.create?.footprints?.[0]?.data) {
              fpBars = nsData.graphicsCmds.create.footprints[0].data;
            }
          } catch {
            // parse error — ignore
          }
        }

        // Series completed → create footprint study
        if (msg.m === "series_completed" && !seriesCompleted) {
          seriesCompleted = true;
          send(msgCreateFootprintStudy(chartSession, studyId, seriesId));
        }

        // Study completed → aggregate and resolve
        if (msg.m === "study_completed" && (msg.p as string[])[1] === studyId) {
          cleanup();
          if (!fpBars || fpBars.length === 0) {
            resolve([]);
            return;
          }
          resolve(aggregateToDaily(fpBars, ohlcvBars));
        }

        // Errors
        if (msg.m === "symbol_error") {
          cleanup();
          reject(new Error(`FP symbol error: ${symbol} — ${msg.p[2]}`));
        }
        if (msg.m === "study_error" && (msg.p as string[])[1] === studyId) {
          cleanup();
          reject(new Error(`FP study error: ${symbol} — ${msg.p[2]}`));
        }
        if (msg.m === "critical_error" || msg.m === "protocol_error") {
          cleanup();
          reject(new Error(`FP protocol error: ${JSON.stringify(msg.p)}`));
        }
      }

      conn.on("error", (err: Error) => {
        clearTimeout(timeout);
        conn.close();
        reject(err);
      });
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async function fetchDaily(symbol: string, opts?: FootprintFetchOptions): Promise<FootprintDaily[]> {
    if (!hasAuth()) return [];

    const normalized = normalizeSymbol(symbol);
    const barCount = Math.min(opts?.bars ?? DEFAULT_BARS, 4000);

    // Check cache
    const cached = getCached(normalized, barCount);
    if (cached) return cached;

    // Queue the fetch — serializes concurrent requests
    try {
      const result = await queue.enqueue(() => doFetch(normalized, barCount));
      setCache(normalized, barCount, result);
      return result;
    } catch (err) {
      // Non-fatal: log and return empty
      console.error(`[FootprintService] ${normalized}: ${(err as Error).message}`);
      return [];
    }
  }

  function clearCache(symbol?: string) {
    if (symbol) {
      const normalized = normalizeSymbol(symbol);
      const keys = Array.from(cache.keys());
      for (const key of keys) {
        if (key.startsWith(normalized + "|")) cache.delete(key);
      }
    } else {
      cache.clear();
    }
  }

  function close() {
    cache.clear();
  }

  return { fetchDaily, clearCache, close };
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function aggregateToDaily(fpBars: FootprintBar[], ohlcvBars: Bar[]): FootprintDaily[] {
  const valid = fpBars.filter(b => b.index < ohlcvBars.length);
  const dayMap = new Map<string, { buy: number; sell: number }>();

  for (const fp of valid) {
    const ohlcv = ohlcvBars[fp.index];
    if (!ohlcv) continue;

    // Convert timestamp to IST date (UTC+5:30)
    const istMs = ohlcv.t * 1000 + 5.5 * 60 * 60 * 1000;
    const date = new Date(istMs).toISOString().split("T")[0];

    const entry = dayMap.get(date) || { buy: 0, sell: 0 };
    for (const level of fp.levels) {
      entry.buy += level.buyVolume;
      entry.sell += level.sellVolume;
    }
    dayMap.set(date, entry);
  }

  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { buy, sell }]) => ({
      date,
      fp_buy_vol: buy,
      fp_sell_vol: sell,
      fp_delta: buy - sell,
      fp_total_vol: buy + sell,
    }));
}

// ─── Singleton export ────────────────────────────────────────────────────────

export const footprintService: FootprintService = createFootprintService();

// ─── Standalone test ─────────────────────────────────────────────────────────

if (import.meta.main) {
  console.log("FootprintService test\n");

  const symbol = process.argv[2] || "NSE:RELIANCE";
  const bars = parseInt(process.argv[3] || "500");

  console.log(`Fetching FP: ${symbol} (${bars} 60-min bars)...`);
  const t0 = performance.now();
  const result = await footprintService.fetchDaily(symbol, { bars });
  console.log(`Done in ${((performance.now() - t0) / 1000).toFixed(1)}s — ${result.length} daily entries\n`);

  // Test cache hit
  const t1 = performance.now();
  const cached = await footprintService.fetchDaily(symbol, { bars });
  console.log(`Cache hit: ${((performance.now() - t1)).toFixed(1)}ms — ${cached.length} entries\n`);

  // Show last 5 days
  const tail = result.slice(-5);
  for (const d of tail) {
    const dir = d.fp_delta > 0 ? "BUY" : "SELL";
    console.log(`  ${d.date} | buy: ${d.fp_buy_vol.toLocaleString().padStart(12)} | sell: ${d.fp_sell_vol.toLocaleString().padStart(12)} | Δ: ${d.fp_delta > 0 ? "+" : ""}${d.fp_delta.toLocaleString().padStart(12)} ${dir}`);
  }

  footprintService.close();
}
