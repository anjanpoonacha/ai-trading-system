/**
 * Connection Manager
 *
 * Lazy initialization, automatic reconnection, request queuing.
 * This is the main entry point for getting data from TradingView WebSocket.
 *
 * Run standalone: bun src/connection/manager.ts
 */

import type { Bar, CVDPoint, SymbolMeta, CVDConfig } from "../types";
import { connect, type TVSocket, type FetchResult, type PanelConfig, type CompositeResult } from "./websocket";
import { getAuthToken, getCVDInputs, hasAuth } from "./auth";
import { AsyncQueue } from "./queue";

export interface BatchConfig {
  timeframe: string;
  count: number;
  cvdConfig: CVDConfig;
}

export interface ConnectionManager {
  getBars(symbol: string, timeframe: string, count: number): Promise<FetchResult>;
  getBarsWithCVD(symbol: string, timeframe: string, count: number, cvdConfig?: CVDConfig): Promise<FetchResult>;
  /** Setup batch mode: persistent series+studies. Call once, then fetchNext per symbol. */
  setupBatch(panelConfigs: BatchConfig[]): Promise<void>;
  /** Fetch one symbol in batch mode. Call after setupBatch. */
  fetchNext(symbol: string): Promise<CompositeResult>;
  close(): void;
}

export function createConnectionManager(): ConnectionManager {
  let socket: TVSocket | null = null;
  let authSocket: TVSocket | null = null; // separate connection for CVD (needs auth)
  const queue = new AsyncQueue();
  const authQueue = new AsyncQueue();

  async function ensureSocket(): Promise<TVSocket> {
    if (socket && socket.isOpen) return socket;
    // Free connection — no auth needed for bars
    socket = await connect("unauthorized_user_token");
    return socket;
  }

  async function ensureAuthSocket(): Promise<TVSocket> {
    if (authSocket && authSocket.isOpen) return authSocket;
    const token = await getAuthToken();
    authSocket = await connect(token);
    return authSocket;
  }

  function getBars(symbol: string, timeframe: string, count: number): Promise<FetchResult> {
    return queue.enqueue(async () => {
      const sock = await ensureSocket();
      return sock.fetchBars(symbol, timeframe, count);
    });
  }

  function getBarsWithCVD(symbol: string, timeframe: string, count: number, cvdConfig?: CVDConfig): Promise<FetchResult> {
    if (!hasAuth()) {
      throw new Error("TV_SESSION_ID required for CVD. Set env vars.");
    }
    return authQueue.enqueue(async () => {
      const sock = await ensureAuthSocket();
      const cvdInputs = await getCVDInputs(cvdConfig);
      return sock.fetchBarsWithCVD(symbol, timeframe, count, cvdInputs);
    });
  }

  async function setupBatch(panelConfigs: BatchConfig[]): Promise<void> {
    if (!hasAuth()) {
      throw new Error("TV_SESSION_ID required for batch CVD. Set env vars.");
    }
    const sock = await ensureAuthSocket();
    const panels: PanelConfig[] = [];
    for (const pc of panelConfigs) {
      const cvdInputs = await getCVDInputs(pc.cvdConfig);
      panels.push({ timeframe: pc.timeframe, count: pc.count, cvdInputs });
    }
    await sock.setupBatch(panels);
  }

  async function fetchNext(symbol: string): Promise<CompositeResult> {
    const sock = await ensureAuthSocket();
    return sock.fetchNext(symbol);
  }

  function close() {
    socket?.close();
    authSocket?.close();
    socket = null;
    authSocket = null;
  }

  return { getBars, getBarsWithCVD, setupBatch, fetchNext, close };
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Connection Manager standalone test\n");

  const mgr = createConnectionManager();

  // Test basic bars (free)
  console.log("Fetching bars (free, no auth)...");
  const r1 = await mgr.getBars("NSE:RELIANCE", "1D", 50);
  console.log(`  ✅ RELIANCE: ${r1.bars.length} bars, last close: ${r1.bars.at(-1)?.c}`);

  const r2 = await mgr.getBars("NSE:TCS", "1W", 100);
  console.log(`  ✅ TCS weekly: ${r2.bars.length} bars, last close: ${r2.bars.at(-1)?.c}`);

  // Test CVD (needs auth)
  if (hasAuth()) {
    console.log("\nFetching bars + CVD (authenticated)...");
    const r3 = await mgr.getBarsWithCVD("NSE:RELIANCE", "1D", 50);
    console.log(`  ✅ RELIANCE + CVD: ${r3.bars.length} bars, ${r3.cvd?.length || 0} CVD points`);
    if (r3.cvd && r3.cvd.length > 0) {
      console.log(`     Last CVD: ${r3.cvd.at(-1)?.c.toFixed(0)}`);
    }
  } else {
    console.log("\n⚠️  No auth — skipping CVD test. Set TV_SESSION_ID to test.");
  }

  mgr.close();
  console.log("\n✅ Done");
}
