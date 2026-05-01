/**
 * Diagnostic test: identify root cause of worker crashes.
 *
 * Runs 20 renders with:
 * - Full worker stderr captured and displayed
 * - Memory usage logged per render (from worker)
 * - Explicit delay between renders to rule out timing issues
 *
 * Run: bun src/chart/test-diag.ts
 */

import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createFetcher } from "../services/fetcher";
import type { ChartBar, CVDBar, CompositeRequest } from "./types";
import type { CVDConfig } from "../types";
import { encodeRequest } from "./protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));
const WORKER_PATH = resolve(__dirname, "worker.ts");

// 100 stocks — find the exact render # and error when worker dies
const SYMBOLS = [
  "RELIANCE", "TCS", "HDFCBANK", "INFY", "ICICIBANK",
  "HINDUNILVR", "SBIN", "BHARTIARTL", "ITC", "KOTAKBANK",
  "LT", "AXISBANK", "ASIANPAINT", "MARUTI", "BAJFINANCE",
  "HCLTECH", "TITAN", "SUNPHARMA", "WIPRO", "TATAMOTORS",
  "ULTRACEMCO", "NESTLEIND", "NTPC", "POWERGRID", "M&M",
  "TATASTEEL", "TECHM", "INDUSINDBK", "JSWSTEEL", "ADANIENT",
  "ONGC", "COALINDIA", "BAJAJFINSV", "GRASIM", "CIPLA",
  "DRREDDY", "DIVISLAB", "BPCL", "BRITANNIA", "APOLLOHOSP",
  "EICHERMOT", "HEROMOTOCO", "HINDALCO", "TATACONSUM", "SBILIFE",
  "ADANIPORTS", "BAJAJ_AUTO", "HDFCLIFE", "UPL", "SHREECEM",
  "DABUR", "PIDILITIND", "SIEMENS", "HAVELLS", "GODREJCP",
  "AMBUJACEM", "DLF", "ICICIGI", "BERGEPAINT", "BIOCON",
  "MUTHOOTFIN", "NAUKRI", "COLPAL", "BANDHANBNK", "VOLTAS",
  "IRCTC", "INDUSTOWER", "GAIL", "BAJAJHIND", "MARICO",
  "TRENT", "JUBLFOOD", "LUPIN", "PIIND", "LALPATHLAB",
  "MPHASIS", "ASTRAL", "IDFCFIRSTB", "SAIL", "PNB",
  "BANKBARODA", "IOC", "PETRONET", "NHPC", "RECLTD",
  "PFC", "TATAPOWER", "VEDL", "JINDALSTEL", "CANBK",
  "IDBI", "CONCOR", "IRFC", "HAL", "BEL",
  "LTIM", "PERSISTENT", "COFORGE", "ETERNAL", "PAYTM",
];

function filterSentinels(cvd: { t: number; o: number; h: number; l: number; c: number }[]): CVDBar[] {
  return cvd
    .filter((d) => Math.abs(d.c) < 1e50 && Math.abs(d.o) < 1e50)
    .map((d) => ({ t: d.t, o: d.o, h: d.h, l: d.l, c: d.c }));
}

function computeSMA(bars: ChartBar[], period: number): (number | null)[] {
  return bars.map((_, i) => {
    if (i < period - 1) return null;
    const slice = bars.slice(i - period + 1, i + 1);
    return +(slice.reduce((s, b) => s + b.c, 0) / period).toFixed(2);
  });
}

async function main() {
  console.log("=== Worker Crash Diagnosis ===\n");

  const fetcher = createFetcher();
  const cvdConfig1: CVDConfig = { anchorPeriod: "12M", useCustomTimeframe: false };
  const cvdConfig2: CVDConfig = { anchorPeriod: "12M", useCustomTimeframe: true, timeframe: "30S" };

  // Spawn worker manually to capture ALL stderr
  console.log("Spawning worker with --expose-gc and max-old-space logging...\n");

  const proc = Bun.spawn(
    ["node", "--expose-gc", "--max-old-space-size=512", "--import", "tsx", WORKER_PATH],
    {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      cwd: resolve(__dirname, "../.."),
      env: { ...process.env, DIAG_MODE: "1" },
    },
  );

  // Collect stderr in background
  const stderrChunks: string[] = [];
  const stderrReader = proc.stderr.getReader();
  const decoder = new TextDecoder();

  (async () => {
    while (true) {
      const { done, value } = await stderrReader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      stderrChunks.push(text);
      // Print stderr live
      for (const line of text.split("\n")) {
        if (line.trim()) console.log(`  [worker stderr] ${line}`);
      }
    }
  })();

  // Wait for ready signal
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("Worker didn't start in 10s")), 10000);
    const check = setInterval(() => {
      if (stderrChunks.join("").includes("chart-worker:ready")) {
        clearInterval(check);
        clearTimeout(timeout);
        resolve();
      }
    }, 50);
  });

  console.log("\n  Worker is ready. Starting renders...\n");

  const stdoutReader = proc.stdout.getReader();
  let stdoutBuf = Buffer.alloc(0);

  async function readResponse(): Promise<Buffer | null> {
    // Read header line
    while (true) {
      const nlIdx = stdoutBuf.indexOf(0x0a);
      if (nlIdx !== -1) {
        const headerLine = stdoutBuf.subarray(0, nlIdx).toString();
        stdoutBuf = stdoutBuf.subarray(nlIdx + 1);
        const header = JSON.parse(headerLine);
        if (!header.ok) {
          console.log(`    ❌ Render error: ${header.error}`);
          return null;
        }
        // Read PNG bytes
        while (stdoutBuf.length < header.size) {
          const { done, value } = await stdoutReader.read();
          if (done) return null;
          stdoutBuf = Buffer.concat([stdoutBuf, Buffer.from(value)]);
        }
        const png = stdoutBuf.subarray(0, header.size);
        stdoutBuf = stdoutBuf.subarray(header.size);
        return png;
      }
      const { done, value } = await stdoutReader.read();
      if (done) return null;
      stdoutBuf = Buffer.concat([stdoutBuf, Buffer.from(value)]);
    }
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < SYMBOLS.length; i++) {
    const symbol = SYMBOLS[i];

    // Fetch data
    const [r1, r2] = await Promise.all([
      fetcher.getBarsWithCVD(symbol, "1D", 188, cvdConfig1),
      fetcher.getBarsWithCVD(symbol, "188", 188, cvdConfig2),
    ]);

    const bars1: ChartBar[] = r1.bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    const cvd1 = filterSentinels(r1.cvd);
    const bars2: ChartBar[] = r2.bars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
    const cvd2 = filterSentinels(r2.cvd);
    const sma = computeSMA(bars1, 20);

    const compositeReq: CompositeRequest = {
      symbol,
      exchange: "NSE",
      panels: [
        { bars: bars1, cvd: cvd1, sma, smaPeriod: 20, volume: true, cvdColor: { up: "#26a69a", down: "#ef5350" }, timeframeLabel: "1D" },
        { bars: bars2, cvd: cvd2, volume: false, cvdColor: { up: "#26a69a", down: "#ef5350" }, timeframeLabel: "188min" },
      ],
      weights: [76, 24],
      options: { width: 1200, height: 1000, theme: "dark", paneRatios: [0.65, 0.14, 0.21] },
    };

    // Check if worker is still alive
    if (proc.exitCode !== null) {
      console.log(`\n  ⚠️  Worker DIED at render ${i + 1} (exit code: ${proc.exitCode})`);
      console.log(`  Last stderr:\n${stderrChunks.slice(-5).join("")}`);
      failCount = SYMBOLS.length - i;
      break;
    }

    // Send render request
    const reqBuf = encodeRequest(compositeReq as any);
    proc.stdin.write(reqBuf);
    proc.stdin.flush();

    // Read response (with 15s timeout)
    const result = await Promise.race([
      readResponse(),
      new Promise<null>((res) => setTimeout(() => res(null), 15000)),
    ]);

    if (result) {
      successCount++;
      console.log(`  [${String(i + 1).padStart(2)}/${SYMBOLS.length}] ${symbol.padEnd(12)} ✅ ${(result.length / 1024).toFixed(1)} KB`);
    } else {
      failCount++;
      console.log(`  [${String(i + 1).padStart(2)}/${SYMBOLS.length}] ${symbol.padEnd(12)} ❌ no response (worker may have died)`);
      if (proc.exitCode !== null) {
        console.log(`\n  Worker exit code: ${proc.exitCode}`);
        break;
      }
    }
  }

  // Cleanup
  proc.stdin.end();
  proc.kill();
  fetcher.close();

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Succeeded: ${successCount}, Failed: ${failCount}`);
  console.log(`\nFull worker stderr output:`);
  console.log(stderrChunks.join(""));
}

main().catch((err) => {
  console.error("❌ Diag failed:", err.message);
  process.exit(1);
});
