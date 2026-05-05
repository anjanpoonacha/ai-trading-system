/**
 * Footprint WebSocket Fetcher
 *
 * Opens a dedicated WebSocket to fetch Volume Footprint data from TradingView.
 * Uses 60-min bars and aggregates to daily fp_buy_vol / fp_sell_vol.
 *
 * Requires TV_SESSION_ID (pro auth).
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
} from "./protocol";
import { getAuthToken } from "./auth";

const PRO_URL = "wss://prodata.tradingview.com/socket.io/websocket?from=chart/&type=chart";
const WS_HEADERS = {
  Origin: "https://www.tradingview.com",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

export interface FootprintResult {
  daily: FootprintDaily[];
}

/**
 * Fetch footprint data for a symbol, aggregate to daily.
 * Uses 60-min bars to maximize FP coverage (~640 trading days at 4000 bars).
 */
export async function fetchFootprint(symbol: string, barCount = 4000): Promise<FootprintResult> {
  const token = await getAuthToken();
  if (token === "unauthorized_user_token") {
    throw new Error("TV_SESSION_ID required for footprint data");
  }

  const chartSession = genSessionId("cs_");
  const resolveId = "fp_sym_1";
  const seriesId = "sds_1";
  const studyId = "fp_st_1";

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(PRO_URL, { headers: WS_HEADERS } as any);
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error(`Footprint timeout for ${symbol}`));
    }, 45_000); // FP responses can be large, allow more time

    let sessionReady = false;
    let seriesCompleted = false;
    const ohlcvBars: Bar[] = [];
    let footprintBars: FootprintBar[] | null = null;

    function send(msg: object) {
      ws.send(encodeFrame(msg));
    }

    function handleOpen() {
      // Wait for session message before sending auth
    }

    function handleRaw(raw: string) {
      const frames = parseFrame(raw);
      for (const frame of frames) {
        if (frame.type === "heartbeat") {
          ws.send(frame.raw);
          continue;
        }
        if (frame.type === "session" && !sessionReady) {
          sessionReady = true;
          // Auth + create chart session + resolve + series
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
    }

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
            footprintBars = nsData.graphicsCmds.create.footprints[0].data;
          }
        } catch {
          // parse error — ignore, will retry on next message
        }
      }

      // Series completed → create footprint study
      if (msg.m === "series_completed" && !seriesCompleted) {
        seriesCompleted = true;
        send(msgCreateFootprintStudy(chartSession, studyId, seriesId));
      }

      // Study completed → aggregate and resolve
      if (msg.m === "study_completed" && (msg.p as string[])[1] === studyId) {
        clearTimeout(timeout);
        ws.close();

        if (!footprintBars || footprintBars.length === 0) {
          resolve({ daily: [] });
          return;
        }

        const daily = aggregateToDaily(footprintBars, ohlcvBars);
        resolve({ daily });
      }

      // Error handling
      if (msg.m === "symbol_error") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`FP symbol error: ${symbol} — ${msg.p[2]}`));
      }
      if (msg.m === "study_error" && (msg.p as string[])[1] === studyId) {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`FP study error: ${symbol} — ${msg.p[2]}`));
      }
      if (msg.m === "critical_error" || msg.m === "protocol_error") {
        clearTimeout(timeout);
        ws.close();
        reject(new Error(`FP protocol error: ${JSON.stringify(msg.p)}`));
      }
    }

    ws.on("open", handleOpen);
    ws.on("message", (raw: Buffer) => handleRaw(raw.toString()));
    ws.on("error", (err: Error) => { clearTimeout(timeout); ws.close(); reject(err); });
  });
}

/**
 * Aggregate 60-min footprint bars to daily totals.
 * Groups by calendar date (IST, UTC+5:30 for NSE).
 */
function aggregateToDaily(fpBars: FootprintBar[], ohlcvBars: Bar[]): FootprintDaily[] {
  // Filter to valid entries (index must map to an OHLCV bar)
  const valid = fpBars.filter(b => b.index < ohlcvBars.length);

  // Group by date using the OHLCV bar timestamp
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

  // Sort by date and return
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

// --- Standalone test ---
if (import.meta.main) {
  console.log("Footprint fetcher test\n");

  const symbol = process.argv[2] || "NSE:RELIANCE";
  const bars = parseInt(process.argv[3] || "500");

  console.log(`Fetching FP: ${symbol} (${bars} 60-min bars)...`);
  const t0 = performance.now();
  const result = await fetchFootprint(symbol, bars);
  console.log(`✅ Done in ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`   ${result.daily.length} daily entries\n`);

  // Show last 10 days
  const tail = result.daily.slice(-10);
  for (const d of tail) {
    const dir = d.fp_delta > 0 ? "BUY" : "SELL";
    console.log(`  ${d.date} | buy: ${d.fp_buy_vol.toLocaleString().padStart(12)} | sell: ${d.fp_sell_vol.toLocaleString().padStart(12)} | Δ: ${d.fp_delta > 0 ? "+" : ""}${d.fp_delta.toLocaleString().padStart(12)} ${dir}`);
  }
}
