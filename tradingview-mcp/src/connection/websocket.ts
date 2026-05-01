/**
 * TradingView WebSocket Connection
 *
 * Low-level WebSocket handler: connect, authenticate, fetch bars for a symbol.
 * Manages heartbeat echoing automatically.
 *
 * Run standalone: bun src/connection/websocket.ts
 */

import { WebSocket } from "ws";
import type { Bar, SymbolMeta, CVDPoint } from "../types";
import {
  encodeFrame,
  parseFrame,
  genSessionId,
  msgSetAuth,
  msgCreateChartSession,
  msgResolveSymbol,
  msgCreateSeries,
  msgModifySeries,
  msgCreateStudy,
  msgRemoveStudy,
  type ParsedFrame,
  type TVMessage,
} from "./protocol";

const FREE_URL = "wss://data.tradingview.com/socket.io/websocket?from=chart/&type=chart";
const PRO_URL = "wss://prodata.tradingview.com/socket.io/websocket?from=chart/&type=chart";
const WS_HEADERS = {
  Origin: "https://www.tradingview.com",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
};

export interface FetchResult {
  bars: Bar[];
  meta: SymbolMeta | null;
  cvd: CVDPoint[] | null;
}

export interface PanelConfig {
  timeframe: string;
  count: number;
  cvdInputs: Record<string, unknown>;
}

export interface CompositeResult {
  symbol: string;
  meta: SymbolMeta | null;
  panels: Array<{ bars: Bar[]; cvd: CVDPoint[] }>;
}

export interface TVSocket {
  fetchBars(symbol: string, timeframe: string, count: number): Promise<FetchResult>;
  fetchBarsWithCVD(symbol: string, timeframe: string, count: number, cvdInputs: Record<string, unknown>): Promise<FetchResult>;
  /** Setup persistent series+studies for batch processing. Call once before fetchNext. */
  setupBatch(panels: PanelConfig[]): Promise<void>;
  /** Fetch one symbol using the persistent batch setup. Call repeatedly after setupBatch. */
  fetchNext(symbol: string): Promise<CompositeResult>;
  close(): void;
  readonly isOpen: boolean;
  readonly requestCount: number;
}

/**
 * Create and connect a TradingView WebSocket.
 * Returns a TVSocket that can fetch bars for multiple symbols sequentially.
 */
export async function connect(authToken = "unauthorized_user_token"): Promise<TVSocket> {
  const url = authToken === "unauthorized_user_token" ? FREE_URL : PRO_URL;
  const ws = new WebSocket(url, { headers: WS_HEADERS });
  const chartSession = genSessionId("cs_");
  let symbolIndex = 0;
  let requestCount = 0;
  let isFirstSeries = true;

  // Wait for connection + session handshake
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Connection timeout")), 10000);

    ws.on("error", (err) => { clearTimeout(timeout); reject(err); });

    ws.on("message", (raw: Buffer) => {
      const frames = parseFrame(raw.toString());
      for (const frame of frames) {
        if (frame.type === "heartbeat") {
          ws.send(frame.raw);
          continue;
        }
        if (frame.type === "session") {
          // Authenticated — send auth + create chart session
          ws.send(encodeFrame(msgSetAuth(authToken)));
          ws.send(encodeFrame(msgCreateChartSession(chartSession)));
          clearTimeout(timeout);
          resolve();
        }
      }
    });
  });

  // Set up persistent heartbeat handler
  const messageHandlers: Array<(frames: ParsedFrame[]) => void> = [];

  ws.on("message", (raw: Buffer) => {
    const frames = parseFrame(raw.toString());
    // Always echo heartbeats
    for (const frame of frames) {
      if (frame.type === "heartbeat") ws.send(frame.raw);
    }
    // Dispatch to current handler
    for (const handler of messageHandlers) handler(frames);
  });

  function send(msg: object) {
    ws.send(encodeFrame(msg));
  }

  function fetchBars(symbol: string, timeframe: string, count: number): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
      const resolveId = `sds_sym_${symbolIndex}`;
      const turnaroundId = `s${symbolIndex}`;
      let bars: Bar[] = [];
      let meta: SymbolMeta | null = null;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout fetching ${symbol}`));
      }, 15000);

      function cleanup() {
        clearTimeout(timeout);
        const idx = messageHandlers.indexOf(handler);
        if (idx >= 0) messageHandlers.splice(idx, 1);
      }

      function handler(frames: ParsedFrame[]) {
        for (const frame of frames) {
          if (frame.type !== "message") continue;
          const msg = frame.data;

          // Symbol resolved
          if (msg.m === "symbol_resolved" && msg.p[1] === resolveId) {
            const info = msg.p[2] as any;
            meta = {
              name: info.name || "",
              fullName: info.full_name || info.pro_name || "",
              exchange: info.exchange || "",
              type: info.type || "",
              description: info.description || "",
              pricescale: info.pricescale || 100,
              currencyCode: info.currency_code || "",
              session: info.session || "",
              timezone: info.timezone || "",
            };
          }

          // Symbol error
          if (msg.m === "symbol_error") {
            cleanup();
            reject(new Error(`Symbol error: ${msg.p[1]} — ${msg.p[2]}`));
            return;
          }

          // Bars data
          if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.sds_1?.s) {
            const candles = (msg.p[1] as any).sds_1.s;
            for (const c of candles) {
              bars.push({ t: c.v[0], o: c.v[1], h: c.v[2], l: c.v[3], c: c.v[4], v: c.v[5] });
            }
          }

          // Series completed — done
          if (msg.m === "series_completed") {
            cleanup();
            requestCount++;
            resolve({ bars, meta, cvd: null });
            return;
          }
        }
      }

      messageHandlers.push(handler);

      // Send resolve + create/modify series
      send(msgResolveSymbol(chartSession, resolveId, symbol));
      if (isFirstSeries) {
        send(msgCreateSeries(chartSession, "sds_1", turnaroundId, resolveId, timeframe, count));
        isFirstSeries = false;
      } else {
        send(msgModifySeries(chartSession, "sds_1", turnaroundId, resolveId, timeframe));
      }
      symbolIndex++;
    });
  }

  function fetchBarsWithCVD(
    symbol: string,
    timeframe: string,
    count: number,
    cvdInputs: Record<string, unknown>,
  ): Promise<FetchResult> {
    return new Promise((resolve, reject) => {
      const resolveId = `sds_sym_${symbolIndex}`;
      const turnaroundId = `s${symbolIndex}`;
      const studyId = `st_cvd_${symbolIndex}`;
      let bars: Bar[] = [];
      let cvd: CVDPoint[] = [];
      let meta: SymbolMeta | null = null;
      let seriesDone = false;
      let studyDone = false;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout fetching ${symbol} with CVD`));
      }, 30000);

      function cleanup() {
        clearTimeout(timeout);
        const idx = messageHandlers.indexOf(handler);
        if (idx >= 0) messageHandlers.splice(idx, 1);
      }

      function tryResolve() {
        if (seriesDone && studyDone) {
          cleanup();
          requestCount++;
          resolve({ bars, meta, cvd });
        }
      }

      function handler(frames: ParsedFrame[]) {
        for (const frame of frames) {
          if (frame.type !== "message") continue;
          const msg = frame.data;

          if (msg.m === "symbol_resolved" && msg.p[1] === resolveId) {
            const info = msg.p[2] as any;
            meta = {
              name: info.name || "", fullName: info.full_name || "", exchange: info.exchange || "",
              type: info.type || "", description: info.description || "",
              pricescale: info.pricescale || 100, currencyCode: info.currency_code || "",
              session: info.session || "", timezone: info.timezone || "",
            };
          }

          if (msg.m === "symbol_error") {
            cleanup();
            reject(new Error(`Symbol error: ${msg.p[1]} — ${msg.p[2]}`));
            return;
          }

          // Price bars
          if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.sds_1?.s) {
            for (const c of (msg.p[1] as any).sds_1.s) {
              bars.push({ t: c.v[0], o: c.v[1], h: c.v[2], l: c.v[3], c: c.v[4], v: c.v[5] });
            }
          }

          // CVD data
          if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.[studyId]?.st) {
            for (const p of (msg.p[1] as any)[studyId].st) {
              cvd.push({ t: p.v[0], o: p.v[1], h: p.v[2], l: p.v[3], c: p.v[4] });
            }
          }

          // Series completed → add CVD study
          if (msg.m === "series_completed" && !seriesDone) {
            seriesDone = true;
            send(msgCreateStudy(chartSession, studyId, "sds_1", "Script@tv-scripting-101!", cvdInputs));
          }

          // Study completed
          if (msg.m === "study_completed" && msg.p[1] === studyId) {
            studyDone = true;
            tryResolve();
          }

          // Study error — reject with error
          if (msg.m === "study_error" && msg.p[1] === studyId) {
            cleanup();
            const reason = msg.p[2] || "unknown study error";
            reject(new Error(`CVD study failed for ${symbol}: ${reason}`));
            return;
          }
        }
      }

      messageHandlers.push(handler);

      send(msgResolveSymbol(chartSession, resolveId, symbol));
      if (isFirstSeries) {
        send(msgCreateSeries(chartSession, "sds_1", turnaroundId, resolveId, timeframe, count));
        isFirstSeries = false;
      } else {
        send(msgModifySeries(chartSession, "sds_1", turnaroundId, resolveId, timeframe));
      }
      symbolIndex++;
    });
  }

  // --- Batch mode: dual chart sessions, one series+study each ---
  let batchPanels: PanelConfig[] | null = null;
  let batchSessions: string[] = [];
  let batchSymbolIdx = 0;

  async function setupBatch(panels: PanelConfig[]): Promise<void> {
    batchPanels = panels;
    batchSessions = panels.map(() => genSessionId("cs_"));
    batchSymbolIdx = 0;

    // Create chart sessions for each panel
    for (const cs of batchSessions) {
      send(msgCreateChartSession(cs));
    }
  }

  function fetchNext(symbol: string): Promise<CompositeResult> {
    if (!batchPanels) throw new Error("Call setupBatch before fetchNext");
    const panels = batchPanels;
    const panelCount = panels.length;
    const isFirst = batchSymbolIdx === 0;
    const idx = batchSymbolIdx++;

    return new Promise((resolve, reject) => {
      let meta: SymbolMeta | null = null;
      const panelBars: Bar[][] = panels.map(() => []);
      const panelCvd: CVDPoint[][] = panels.map(() => []);
      const seriesDone: boolean[] = panels.map(() => false);
      const studyDone: boolean[] = panels.map(() => false);

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout fetching ${symbol}`));
      }, 30000);

      function cleanup() {
        clearTimeout(timeout);
        const i = messageHandlers.indexOf(handler);
        if (i >= 0) messageHandlers.splice(i, 1);
      }

      function tryResolve() {
        if (seriesDone.every(Boolean) && studyDone.every(Boolean)) {
          cleanup();
          requestCount++;
          resolve({
            symbol,
            meta,
            panels: panels.map((_, i) => ({ bars: panelBars[i], cvd: panelCvd[i] })),
          });
        }
      }

      function handler(frames: ParsedFrame[]) {
        for (const frame of frames) {
          if (frame.type !== "message") continue;
          const msg = frame.data;

          // Match by session
          const sessionIdx = batchSessions.indexOf(msg.p[0]);
          if (sessionIdx === -1) continue; // not our message

          if (msg.m === "symbol_resolved" && msg.p[1] === `sym_${idx}`) {
            const info = msg.p[2] as any;
            if (!meta) {
              meta = {
                name: info.name || "", fullName: info.full_name || info.pro_name || "",
                exchange: info.exchange || "", type: info.type || "",
                description: info.description || "", pricescale: info.pricescale || 100,
                currencyCode: info.currency_code || "", session: info.session || "",
                timezone: info.timezone || "",
              };
            }
          }

          if (msg.m === "symbol_error" && msg.p[1] === `sym_${idx}`) {
            cleanup();
            reject(new Error(`Symbol error: ${symbol} — ${msg.p[2]}`));
            return;
          }

          // Bars data
          if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.sds_1?.s) {
            for (const c of (msg.p[1] as any).sds_1.s) {
              panelBars[sessionIdx].push({ t: c.v[0], o: c.v[1], h: c.v[2], l: c.v[3], c: c.v[4], v: c.v[5] });
            }
          }

          // Series completed → create study on first symbol
          if (msg.m === "series_completed" && !seriesDone[sessionIdx]) {
            seriesDone[sessionIdx] = true;
            if (isFirst) {
              send(msgCreateStudy(batchSessions[sessionIdx], "st1", "sds_1", "Script@tv-scripting-101!", panels[sessionIdx].cvdInputs));
            }
          }

          // CVD data
          if ((msg.m === "timescale_update" || msg.m === "du") && (msg.p[1] as any)?.st1?.st) {
            for (const p of (msg.p[1] as any).st1.st) {
              panelCvd[sessionIdx].push({ t: p.v[0], o: p.v[1], h: p.v[2], l: p.v[3], c: p.v[4] });
            }
          }

          // Study completed
          if (msg.m === "study_completed" && msg.p[1] === "st1" && !studyDone[sessionIdx]) {
            studyDone[sessionIdx] = true;
            tryResolve();
          }

          // Study error
          if (msg.m === "study_error" && msg.p[1] === "st1") {
            cleanup();
            reject(new Error(`CVD study failed for ${symbol} panel ${sessionIdx}: ${msg.p[2]}`));
            return;
          }
        }
      }

      messageHandlers.push(handler);

      // Send commands to each session
      const resolveId = `sym_${idx}`;
      for (let i = 0; i < panelCount; i++) {
        send(msgResolveSymbol(batchSessions[i], resolveId, symbol));
        if (isFirst) {
          send(msgCreateSeries(batchSessions[i], "sds_1", `s${idx}`, resolveId, panels[i].timeframe, panels[i].count));
        } else {
          send(msgModifySeries(batchSessions[i], "sds_1", `s${idx}`, resolveId, panels[i].timeframe));
        }
      }
    });
  }

  return {
    fetchBars,
    fetchBarsWithCVD,
    setupBatch,
    fetchNext,
    close: () => ws.close(),
    get isOpen() { return ws.readyState === WebSocket.OPEN; },
    get requestCount() { return requestCount; },
  };
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("WebSocket standalone test\n");

  const socket = await connect();
  console.log("✅ Connected (free, no auth)\n");

  const symbols = ["NSE:RELIANCE", "NSE:TCS", "NSE:INFY"];
  for (const sym of symbols) {
    const t0 = performance.now();
    const result = await socket.fetchBars(sym, "1D", 100);
    const ms = (performance.now() - t0).toFixed(0);
    console.log(`  ${sym}: ${result.bars.length} bars in ${ms}ms | Close: ${result.bars.at(-1)?.c}`);
  }

  console.log(`\nTotal requests: ${socket.requestCount}`);
  socket.close();
  console.log("✅ Done");
}
