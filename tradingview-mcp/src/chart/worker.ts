/**
 * Worker — persistent Node.js process that renders charts on demand.
 *
 * Reads JSON requests from stdin (one per line).
 * Writes response: JSON header line + raw PNG binary to stdout.
 * Auto-exits after MAX_RENDERS to prevent memory creep (parent auto-restarts).
 *
 * Run standalone: echo '{"bars":[...]}' | node --import tsx src/chart/worker.ts
 * Keep alive:     node --import tsx src/chart/worker.ts  (then write JSON lines to stdin)
 */

import { renderChart, renderComposite } from "./renderer";
import { decodeRequest, encodeResponseHeader } from "./protocol";
import { createInterface } from "readline";
import type { CompositeRequest } from "./types";

const MAX_RENDERS = 200;
const DIAG_MODE = !!process.env.DIAG_MODE;
let renderCount = 0;

// Signal ready to parent
process.stderr.write("chart-worker:ready\n");

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line: string) => {
  if (!line.trim()) return;

  try {
    const req = JSON.parse(line);

    // Route to composite or single chart renderer
    let png: Buffer;
    if ("panels" in req && "symbol" in req) {
      png = await renderComposite(req as CompositeRequest);
    } else {
      png = await renderChart(req);
    }

    // Write header + binary PNG to stdout
    const header = encodeResponseHeader({ ok: true, size: png.length });
    process.stdout.write(header);
    process.stdout.write(png);

    renderCount++;

    if (DIAG_MODE) {
      const mem = process.memoryUsage();
      process.stderr.write(
        `chart-worker:render #${renderCount} | rss=${(mem.rss / 1024 / 1024).toFixed(0)}MB heap=${(mem.heapUsed / 1024 / 1024).toFixed(0)}/${(mem.heapTotal / 1024 / 1024).toFixed(0)}MB ext=${(mem.external / 1024 / 1024).toFixed(0)}MB\n`
      );
      // Attempt manual GC if available
      if (typeof globalThis.gc === "function") {
        globalThis.gc();
      }
    }

    if (renderCount >= MAX_RENDERS) {
      process.stderr.write(`chart-worker:exit (${MAX_RENDERS} renders reached)\n`);
      process.exit(0);
    }
  } catch (err: any) {
    const header = encodeResponseHeader({ ok: false, error: err.message || "render failed" });
    process.stdout.write(header);
  }
});

rl.on("close", () => {
  process.exit(0);
});

process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
