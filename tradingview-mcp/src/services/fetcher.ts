/**
 * Fetcher Service — orchestrates data retrieval
 *
 * Combines: ConnectionManager (WebSocket bars) + Scanner API (snapshot data)
 * This is what tools call.
 *
 * Run standalone: bun src/services/fetcher.ts
 */

import type { Bar, ScanResult, CVDPoint, SymbolMeta, CVDConfig } from "../types";
import { createConnectionManager, type ConnectionManager } from "../connection/manager";

const SCANNER_URL = "https://scanner.tradingview.com/india/scan";
const SCANNER_HEADERS = {
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  origin: "https://www.tradingview.com",
  referer: "https://www.tradingview.com/",
};

export interface Fetcher {
  getBars(symbol: string, timeframe: string, count: number): Promise<{ bars: Bar[]; meta: SymbolMeta | null }>;
  getBarsWithCVD(symbol: string, timeframe: string, count: number, cvdConfig?: CVDConfig): Promise<{ bars: Bar[]; meta: SymbolMeta | null; cvd: CVDPoint[] }>;
  scan(symbols: string[], columns: string[]): Promise<ScanResult[]>;
  close(): void;
}

export function createFetcher(): Fetcher {
  const mgr = createConnectionManager();

  function normalizeSymbol(sym: string): string {
    return sym.includes(":") ? sym : `NSE:${sym}`;
  }

  async function getBars(symbol: string, timeframe: string, count: number) {
    const result = await mgr.getBars(normalizeSymbol(symbol), timeframe, count);
    return { bars: result.bars, meta: result.meta };
  }

  async function getBarsWithCVD(symbol: string, timeframe: string, count: number, cvdConfig?: CVDConfig) {
    const result = await mgr.getBarsWithCVD(normalizeSymbol(symbol), timeframe, count, cvdConfig);
    return { bars: result.bars, meta: result.meta, cvd: result.cvd || [] };
  }

  async function scan(symbols: string[], columns: string[]): Promise<ScanResult[]> {
    const tickers = symbols.map(normalizeSymbol);

    const payload = {
      markets: ["india"],
      symbols: { tickers },
      columns,
      options: { lang: "en" },
      range: [0, tickers.length],
    };

    const resp = await fetch(SCANNER_URL, {
      method: "POST",
      headers: SCANNER_HEADERS,
      body: JSON.stringify(payload),
    });

    if (!resp.ok) throw new Error(`Scanner API error: ${resp.status}`);
    const result = (await resp.json()) as any;
    if (result.error) throw new Error(`Scanner: ${result.error}`);

    return (result.data || []).map((row: any) => {
      const data: Record<string, unknown> = {};
      columns.forEach((col, i) => { data[col] = row.d[i]; });
      return { symbol: row.s, data };
    });
  }

  return { getBars, getBarsWithCVD, scan, close: () => mgr.close() };
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Fetcher service test\n");

  const fetcher = createFetcher();

  // Test bars
  const { bars, meta } = await fetcher.getBars("RELIANCE", "1D", 50);
  console.log(`✅ getBars: ${bars.length} bars, ${meta?.fullName}`);

  // Test scanner
  const scanResult = await fetcher.scan(
    ["RELIANCE", "TCS", "INFY"],
    ["name", "close", "SMA200", "RSI", "volume", "market_cap_basic", "sector"],
  );
  console.log(`\n✅ scan: ${scanResult.length} results`);
  for (const r of scanResult) {
    console.log(`  ${r.symbol}: close=${r.data.close} RSI=${(r.data.RSI as number)?.toFixed(1)} sector=${r.data.sector}`);
  }

  fetcher.close();
  console.log("\n✅ Done");
}
