/**
 * Chart Client — Bun-side API that spawns and manages the Node chart worker.
 *
 * Features:
 * - Auto-spawns worker on first render()
 * - Auto-restarts if worker exits (MAX_RENDERS or crash)
 * - Timeout per render (kills + restarts on timeout)
 * - Serializes concurrent calls (one render at a time)
 *
 * Standalone test: bun src/chart/client.ts
 */

import { Subprocess } from "bun";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import type { ChartRequest, CompositeRequest, ResponseHeader } from "./types";
import { encodeRequest } from "./protocol";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_WORKER_PATH = resolve(__dirname, "worker.ts");
const DEFAULT_TIMEOUT = 10_000;

export interface ChartClient {
  render(req: ChartRequest): Promise<Buffer>;
  renderComposite(req: CompositeRequest): Promise<Buffer>;
  close(): void;
}

export function createChartClient(opts?: {
  workerPath?: string;
  timeout?: number;
}): ChartClient {
  const workerPath = opts?.workerPath ?? DEFAULT_WORKER_PATH;
  const timeout = opts?.timeout ?? DEFAULT_TIMEOUT;

  let proc: Subprocess<"pipe", "pipe", "pipe"> | null = null;
  let ready = false;
  let readyPromise: Promise<void> | null = null;
  let queue: Promise<any> = Promise.resolve();

  function spawn(): Promise<void> {
    proc = Bun.spawn(["node", "--import", "tsx", workerPath], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
      cwd: resolve(__dirname, "../.."),
    });

    ready = false;
    readyPromise = waitForReady();
    return readyPromise;
  }

  async function waitForReady(): Promise<void> {
    if (!proc) throw new Error("Worker not spawned");

    const reader = proc.stderr.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) throw new Error("Worker exited before ready");
      buffer += decoder.decode(value, { stream: true });
      if (buffer.includes("chart-worker:ready")) {
        ready = true;
        // Release the reader — we don't need stderr anymore
        reader.releaseLock();
        return;
      }
    }
  }

  async function ensureWorker(): Promise<void> {
    if (proc && ready) {
      // Check if still alive
      if (proc.exitCode !== null) {
        proc = null;
        ready = false;
      }
    }
    if (!proc || !ready) {
      await spawn();
    }
  }

  async function doRender(req: ChartRequest | CompositeRequest): Promise<Buffer> {
    await ensureWorker();
    if (!proc) throw new Error("Failed to spawn worker");

    // Send request
    const reqBuf = encodeRequest(req);
    proc.stdin.write(reqBuf);
    proc.stdin.flush();

    // Read response with timeout (clear timeout on success or failure)
    let timer: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        proc?.kill();
        proc = null;
        ready = false;
        reject(new Error(`Chart render timed out after ${timeout}ms`));
      }, timeout);
    });

    try {
      const result = await Promise.race([readResponse(), timeoutPromise]);
      return result;
    } finally {
      clearTimeout(timer!);
    }
  }

  async function readResponse(): Promise<Buffer> {
    if (!proc) throw new Error("No worker process");

    const reader = proc.stdout.getReader();
    let buffer = Buffer.alloc(0);

    try {
      // Phase 1: Read until we get the header line (ends with \n)
      let header: ResponseHeader | null = null;
      while (!header) {
        const { done, value } = await reader.read();
        if (done) throw new Error("Worker stdout closed unexpectedly");
        buffer = Buffer.concat([buffer, Buffer.from(value)]);

        const newlineIdx = buffer.indexOf(0x0a); // \n
        if (newlineIdx !== -1) {
          const headerLine = buffer.subarray(0, newlineIdx).toString();
          header = JSON.parse(headerLine) as ResponseHeader;
          buffer = buffer.subarray(newlineIdx + 1); // remaining bytes after header
        }
      }

      if (!header.ok) {
        throw new Error(header.error || "Render failed");
      }

      // Phase 2: Read exactly `size` bytes of PNG
      const pngSize = header.size!;
      while (buffer.length < pngSize) {
        const { done, value } = await reader.read();
        if (done) throw new Error("Worker stdout closed before full PNG received");
        buffer = Buffer.concat([buffer, Buffer.from(value)]);
      }

      // Return exactly pngSize bytes (rest stays in buffer — but since we serialize, this is fine)
      return buffer.subarray(0, pngSize);
    } finally {
      reader.releaseLock();
    }
  }



  // Serialize renders (one at a time)
  function render(req: ChartRequest): Promise<Buffer> {
    const p = queue.then(() => doRender(req));
    queue = p.catch(() => {});
    return p;
  }

  function renderComposite(req: CompositeRequest): Promise<Buffer> {
    const p = queue.then(() => doRender(req));
    queue = p.catch(() => {});
    return p;
  }

  function close() {
    if (proc) {
      proc.stdin.end();
      proc.kill();
      proc = null;
      ready = false;
    }
  }

  return { render, renderComposite, close };
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Chart client integration test\n");

  const client = createChartClient();

  // Generate sample bars
  const bars = [];
  let price = 1350;
  const baseTime = Math.floor(Date.now() / 1000) - 30 * 86400;

  for (let i = 0; i < 30; i++) {
    const change = (Math.random() - 0.48) * 15;
    const open = price;
    const close = price + change;
    bars.push({
      t: baseTime + i * 86400,
      o: +open.toFixed(2),
      h: +(Math.max(open, close) + Math.random() * 8).toFixed(2),
      l: +(Math.min(open, close) - Math.random() * 8).toFixed(2),
      c: +close.toFixed(2),
      v: Math.round(5_000_000 + Math.random() * 8_000_000),
    });
    price = close;
  }

  console.log("  Rendering chart (first call — includes worker spawn)...");
  const t1 = performance.now();
  const png1 = await client.render({
    bars,
    options: { title: "CLIENT TEST", width: 800, height: 500 },
  });
  const elapsed1 = (performance.now() - t1).toFixed(0);
  console.log(`  ✅ First render: ${png1.length} bytes (${(png1.length / 1024).toFixed(1)} KB) in ${elapsed1}ms`);

  console.log("\n  Rendering chart (second call — worker already warm)...");
  const t2 = performance.now();
  const png2 = await client.render({
    bars,
    options: { title: "CLIENT TEST 2", width: 800, height: 500 },
  });
  const elapsed2 = (performance.now() - t2).toFixed(0);
  console.log(`  ✅ Second render: ${png2.length} bytes (${(png2.length / 1024).toFixed(1)} KB) in ${elapsed2}ms`);

  // Save last one
  await Bun.write("/tmp/chart-client-test.png", png2);
  console.log(`\n  ✅ Saved to /tmp/chart-client-test.png`);
  console.log(`\nOpen with: open /tmp/chart-client-test.png`);

  client.close();
}
