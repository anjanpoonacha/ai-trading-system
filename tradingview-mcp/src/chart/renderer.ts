/**
 * Renderer — pure function: ChartRequest → PNG Buffer.
 *
 * Uses jsdom + lightweight-charts to produce pixel-perfect TradingView charts.
 * jsdom environment is initialized once at module load.
 *
 * MUST run in Node.js (not Bun) — requires `canvas` native addon.
 *
 * Standalone test: node --import tsx src/chart/renderer.ts
 *   → renders sample chart to /tmp/chart-test.png
 */

import { JSDOM } from "jsdom";
import type { ChartRequest, ChartBar, CVDBar, CompositeRequest, PanelRequest, PanelSpec, Layer } from "./types";

// --- jsdom global setup (once per process) ---

const dom = new JSDOM(
  `<!DOCTYPE html><html><body><div id="chart-container"></div></body></html>`,
  { pretendToBeVisual: true },
);

const win = dom.window;

// Use Object.defineProperty for readonly globals like navigator
Object.defineProperty(globalThis, "window", { value: win, writable: true, configurable: true });
Object.defineProperty(globalThis, "document", { value: win.document, writable: true, configurable: true });
Object.defineProperty(globalThis, "navigator", { value: win.navigator, writable: true, configurable: true });
Object.defineProperty(globalThis, "location", { value: { href: "http://localhost" }, writable: true, configurable: true });
Object.defineProperty(globalThis, "HTMLElement", { value: win.HTMLElement, writable: true, configurable: true });
Object.defineProperty(globalThis, "Element", { value: win.Element, writable: true, configurable: true });

// lightweight-charts checks matchMedia for DPI
(win as any).matchMedia = (_query: string) => ({
  matches: false,
  media: "",
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
});

// --- Import lightweight-charts AFTER globals are set ---

const {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  ColorType,
} = await import("lightweight-charts");

// --- Helpers ---

function toUTCDate(timestamp: number): string {
  const d = new Date(timestamp * 1000);
  return d.toISOString().split("T")[0];
}

/** Format large numbers: 1234567 → "1.23M", 45000 → "45K" */
function formatLargeNumber(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs.toFixed(0)}`;
}

/**
 * Detect if data is daily (timestamps at midnight boundaries or ~86400s apart)
 * and convert accordingly. Lightweight-charts expects:
 * - Daily: "YYYY-MM-DD" string
 * - Intraday: Unix timestamp (number)
 */
function isDaily(bars: { t: number }[]): boolean {
  if (bars.length < 2) return true;
  const diff = bars[1].t - bars[0].t;
  return diff >= 86400; // >= 1 day apart
}

function toChartTime(t: number, daily: boolean): string | number {
  return daily ? toUTCDate(t) : t;
}

// --- Core render function: layer-based panel ---

export async function renderPanel(spec: PanelSpec): Promise<Buffer> {
  const { layers, width = 800, height = 600, theme = "dark" } = spec;
  if (layers.length === 0) throw new Error("Panel must have at least one layer");

  // Detect daily vs intraday from first data-bearing layer
  const firstData = layers.find((l) => l.type === "candlestick" || l.type === "volume" || l.type === "cvd");
  const daily = firstData
    ? isDaily("data" in firstData ? (firstData as any).data : [])
    : true;

  const isDark = theme === "dark";
  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const textColor = isDark ? "#d1d4dc" : "#191919";
  const gridColor = isDark ? "#2a2a4a" : "#e0e0e0";

  const container = win.document.createElement("div");
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  win.document.body.appendChild(container);

  const chart = createChart(container, {
    width,
    height,
    layout: { background: { type: ColorType.Solid, color: bgColor }, textColor },
    grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
    rightPriceScale: { borderColor: gridColor },
    timeScale: { borderColor: gridColor, timeVisible: !daily },
    crosshair: { mode: 2 },
    localization: { locale: "en-US" },
  });

  // Add each layer
  for (const layer of layers) {
    const pane = layer.pane ?? 0;

    switch (layer.type) {
      case "candlestick": {
        const series = chart.addSeries(CandlestickSeries, {
          upColor: "#26a69a", downColor: "#ef5350",
          wickUpColor: "#26a69a", wickDownColor: "#ef5350",
          borderUpColor: "#26a69a", borderDownColor: "#ef5350",
        }, pane);
        series.setData(layer.data.map((b) => ({
          time: toChartTime(b.t, daily), open: b.o, high: b.h, low: b.l, close: b.c,
        })));
        break;
      }
      case "line": {
        // Need a reference time axis — use timestamps from candlestick layer
        const candleLayer = layers.find((l) => l.type === "candlestick") as { data: ChartBar[] } | undefined;
        const volLayer = layers.find((l) => l.type === "volume") as { data: ChartBar[] } | undefined;
        const refBars = candleLayer?.data ?? volLayer?.data;
        if (!refBars) break;

        const series = chart.addSeries(LineSeries, {
          color: layer.color ?? "#26a69a",
          lineWidth: layer.lineWidth ?? 2,
          crosshairMarkerVisible: false,
          title: layer.title ?? "",
        }, pane);

        const lineData = refBars
          .map((b, i) => ({ time: toChartTime(b.t, daily), value: layer.data[i] }))
          .filter((d) => d.value !== null && d.value !== undefined) as Array<{ time: string | number; value: number }>;
        series.setData(lineData);
        break;
      }
      case "volume": {
        const series = chart.addSeries(HistogramSeries, {
          priceFormat: { type: "volume" },
          priceScaleId: "volume",
        }, pane);
        series.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });
        series.setData(layer.data.map((b) => ({
          time: toChartTime(b.t, daily),
          value: b.v,
          color: b.c >= b.o ? "rgba(38, 166, 154, 0.6)" : "rgba(239, 83, 80, 0.6)",
        })));
        // Volume MA overlay
        const maPeriod = layer.maperiod ?? 30;
        if (maPeriod > 0 && layer.data.length > maPeriod) {
          const maSeries = chart.addSeries(LineSeries, {
            color: "#ffab00",
            lineWidth: 1,
            crosshairMarkerVisible: false,
            priceScaleId: "volume",
            title: "",
          }, pane);
          const maData = layer.data
            .map((_, i) => {
              if (i < maPeriod - 1) return null;
              const slice = layer.data.slice(i - maPeriod + 1, i + 1);
              return { time: toChartTime(layer.data[i].t, daily), value: slice.reduce((s, b) => s + b.v, 0) / maPeriod };
            })
            .filter(Boolean) as Array<{ time: string | number; value: number }>;
          maSeries.setData(maData);
        }
        break;
      }
      case "cvd": {
        const up = layer.color?.up ?? "#26a69a";
        const down = layer.color?.down ?? "#ef5350";
        const series = chart.addSeries(CandlestickSeries, {
          upColor: up, downColor: down,
          wickUpColor: up, wickDownColor: down,
          borderUpColor: up, borderDownColor: down,
          title: "CVD",
          priceFormat: { type: "custom", formatter: formatLargeNumber },
        }, pane);
        series.setData(layer.data.map((d) => ({
          time: toChartTime(d.t, daily), open: d.o, high: d.h, low: d.l, close: d.c,
        })));
        break;
      }
    }
  }

  // Set pane stretch factors based on number of panes
  const panes = chart.panes();
  if (panes.length === 3) {
    panes[0].setStretchFactor(0.65);
    panes[1].setStretchFactor(0.14);
    panes[2].setStretchFactor(0.21);
  } else if (panes.length === 2) {
    panes[0].setStretchFactor(0.75);
    panes[1].setStretchFactor(0.25);
  }

  chart.timeScale().fitContent();

  const canvas = chart.takeScreenshot();
  const dataUrl = canvas.toDataURL("image/png");
  const png = Buffer.from(dataUrl.replace(/^data:image\/png;base64,/, ""), "base64");

  chart.remove();
  container.remove();
  return png;
}

// --- Legacy compat: renderChart delegates to renderPanel ---

export async function renderChart(req: ChartRequest): Promise<Buffer> {
  const { bars, cvd, sma, options = {} } = req;
  const { width, height, theme, smaPeriod, cvdColor, paneRatios } = options;

  const layers: Layer[] = [
    { type: "candlestick", data: bars, pane: 0 },
  ];
  if (sma && sma.some((v) => v !== null)) {
    layers.push({ type: "line", data: sma, color: "#26a69a", title: smaPeriod ? `SMA${smaPeriod}` : "SMA", pane: 0 });
  }
  layers.push({ type: "volume", data: bars, pane: 1, maperiod: 30 });
  if (cvd && cvd.length > 0) {
    layers.push({ type: "cvd", data: cvd, color: cvdColor, pane: 2 });
  }

  return renderPanel({ layers, width, height, theme });
}

// --- Composite chart (multiple panels stitched with header) ---

export async function renderComposite(req: CompositeRequest): Promise<Buffer> {
  const { symbol, description, exchange, panels, weights, options = {} } = req;
  const { width = 1200, height = 1000, theme = "dark", paneRatios } = options;

  const isDark = theme === "dark";
  const bgColor = isDark ? "#1a1a2e" : "#ffffff";
  const headerHeight = 32;
  const separatorHeight = 4;
  const totalChartHeight = height - headerHeight - separatorHeight * (panels.length - 1);

  const w = weights ?? panels.map((_, i) => i === 0 ? 7 : 3);
  const totalWeight = w.reduce((a, b) => a + b, 0);
  const panelHeights = w.map((wt) => Math.round((wt / totalWeight) * totalChartHeight));

  // Convert PanelRequests to PanelSpecs and render
  const panelImages: Buffer[] = [];
  for (let i = 0; i < panels.length; i++) {
    const panel = panels[i];
    const panelH = panelHeights[i];

    const layers: Layer[] = [];
    if (panel.volume !== false) {
      layers.push({ type: "candlestick", data: panel.bars, pane: 0 });
      if (panel.sma && panel.sma.some((v) => v !== null)) {
        layers.push({ type: "line", data: panel.sma, color: "#26a69a", title: panel.smaPeriod ? `SMA${panel.smaPeriod}` : "SMA", pane: 0 });
      }
      layers.push({ type: "volume", data: panel.bars, pane: 1, maperiod: panel.volumeMA ?? 30 });
      if (panel.cvd && panel.cvd.length > 0) {
        layers.push({ type: "cvd", data: panel.cvd, color: panel.cvdColor, pane: 2 });
      }
    } else {
      // CVD-only panel
      if (panel.cvd && panel.cvd.length > 0) {
        layers.push({ type: "cvd", data: panel.cvd, color: panel.cvdColor, pane: 0 });
      }
    }

    panelImages.push(await renderPanel({ layers, width, height: panelH, theme }));
  }

  // Stitch panels together with header
  const { createCanvas, loadImage } = await import("canvas");
  const finalCanvas = createCanvas(width, height);
  const ctx = finalCanvas.getContext("2d");

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, width, height);

  // Header
  ctx.fillStyle = isDark ? "#d1d4dc" : "#191919";
  ctx.font = "bold 14px -apple-system, sans-serif";
  const headerParts = [symbol];
  if (description) headerParts.push(description);
  if (panels[0]?.timeframeLabel) headerParts.push(panels[0].timeframeLabel);
  if (exchange) headerParts.push(exchange);
  ctx.fillText(headerParts.join(" · "), 12, 22);

  // Draw panels
  let yOffset = headerHeight;
  for (let i = 0; i < panelImages.length; i++) {
    const img = await loadImage(panelImages[i]);
    ctx.drawImage(img, 0, yOffset);
    yOffset += panelHeights[i];
    if (i < panels.length - 1) {
      ctx.fillStyle = isDark ? "#3a3a5a" : "#cccccc";
      ctx.fillRect(0, yOffset, width, separatorHeight);
      yOffset += separatorHeight;
    }
  }

  return Buffer.from(finalCanvas.toBuffer("image/png"));
}

// --- Standalone test ---

async function main() {
  console.log("Renderer standalone test\n");

  // Generate 60 bars of sample data (simulating RELIANCE ~₹1300-1400)
  const bars: ChartBar[] = [];
  let price = 1350;
  const baseTime = Math.floor(Date.now() / 1000) - 60 * 86400;

  for (let i = 0; i < 60; i++) {
    const change = (Math.random() - 0.48) * 20;
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 10;
    const low = Math.min(open, close) - Math.random() * 10;
    const volume = 5_000_000 + Math.random() * 10_000_000;
    bars.push({
      t: baseTime + i * 86400,
      o: +open.toFixed(2),
      h: +high.toFixed(2),
      l: +low.toFixed(2),
      c: +close.toFixed(2),
      v: Math.round(volume),
    });
    price = close;
  }

  // Compute SMA20
  const sma: (number | null)[] = bars.map((_, i) => {
    if (i < 19) return null;
    const slice = bars.slice(i - 19, i + 1);
    return +(slice.reduce((s, b) => s + b.c, 0) / 20).toFixed(2);
  });

  // Generate CVD data (simulated)
  let cumDelta = 0;
  const cvd: CVDBar[] = bars.map((b) => {
    const delta = b.c >= b.o ? b.v * 0.6 : -b.v * 0.4;
    const open = cumDelta;
    cumDelta += delta;
    const close = cumDelta;
    return {
      t: b.t,
      o: open,
      h: Math.max(open, close) + Math.abs(delta) * 0.1,
      l: Math.min(open, close) - Math.abs(delta) * 0.1,
      c: close,
    };
  });

  const start = performance.now();
  const png = await renderChart({
    bars,
    cvd,
    sma,
    options: {
      title: "RELIANCE 1D",
      width: 1000,
      height: 700,
      watermark: "RELIANCE",
    },
  });
  const elapsed = (performance.now() - start).toFixed(0);

  const outPath = "/tmp/chart-test.png";
  const fs = await import("fs");
  fs.writeFileSync(outPath, png);

  console.log(`  ✅ Rendered ${png.length} bytes (${(png.length / 1024).toFixed(1)} KB) in ${elapsed}ms`);
  console.log(`  ✅ Saved to ${outPath}`);
  console.log(`  ✅ 60 candles + SMA20 + Volume pane + CVD pane`);
  console.log(`\nOpen with: open ${outPath}`);
}

// Handle both ESM main check patterns
const isMain = typeof require !== "undefined"
  ? require.main === module
  : process.argv[1]?.includes("renderer");

if (isMain) {
  main().catch((err) => {
    console.error("❌ Renderer test failed:", err.message);
    process.exit(1);
  });
}
