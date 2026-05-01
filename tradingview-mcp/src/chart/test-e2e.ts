/**
 * End-to-end test: Fetch live data → render composite chart (multi-panel) → save PNG.
 *
 * Generates the default layout:
 *   Top (70%): 1D candles + SMA20 + volume + CVD(12M, false)
 *   Bottom (30%): 188min CVD(12M, true, 30S)
 *
 * Run: bun src/chart/test-e2e.ts
 */

import { createFetcher } from "../services/fetcher";
import { createChartClient } from "./client";
import { DEFAULT_CHART } from "./defaults";
import type { ChartBar, CVDBar, PanelRequest } from "./types";

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
  console.log("Chart E2E: composite multi-panel chart\n");

  const fetcher = createFetcher();
  const chart = createChartClient();
  const preset = DEFAULT_CHART;

  try {
    const symbol = "RELIANCE";
    const panelRequests: PanelRequest[] = [];

    for (let i = 0; i < preset.panels.length; i++) {
      const panel = preset.panels[i];
      console.log(`  Panel ${i + 1}: ${panel.timeframe} (${panel.bars} bars), CVD(${panel.cvd.anchorPeriod}, customTF=${panel.cvd.useCustomTimeframe}${panel.cvd.useCustomTimeframe ? `, ${panel.cvd.timeframe}` : ""})`);

      const { bars: rawBars, meta, cvd: rawCvd } = await fetcher.getBarsWithCVD(
        symbol, panel.timeframe, panel.bars, panel.cvd,
      );
      console.log(`    ✅ ${rawBars.length} bars, ${rawCvd.length} CVD raw`);

      const bars: ChartBar[] = rawBars.map((b) => ({ t: b.t, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v }));
      const cvd = filterSentinels(rawCvd);
      console.log(`    ✅ ${cvd.length} CVD after filtering`);

      const panelReq: PanelRequest = {
        bars,
        cvd,
        volume: panel.volume,
        cvdColor: panel.cvdColor,
        timeframeLabel: panel.timeframe === "1D" ? "1D" : `${panel.timeframe}min`,
      };

      if (panel.sma) {
        panelReq.sma = computeSMA(bars, panel.sma);
        panelReq.smaPeriod = panel.sma;
      }

      panelRequests.push(panelReq);

      if (i === 0 && meta) {
        console.log(`    ✅ ${meta.fullName} — last close: ₹${rawBars.at(-1)?.c}`);
      }
    }

    // Render composite
    console.log("\n  Rendering composite chart...");
    const t = performance.now();
    const png = await chart.renderComposite({
      symbol,
      description: "Reliance Industries Limited",
      exchange: "NSE",
      panels: panelRequests,
      weights: preset.panels.map((p) => p.weight),
      options: preset.options,
    });
    const elapsed = (performance.now() - t).toFixed(0);
    console.log(`  ✅ Rendered ${(png.length / 1024).toFixed(1)} KB in ${elapsed}ms`);

    const outPath = "/tmp/reliance-composite.png";
    await Bun.write(outPath, png);
    console.log(`  ✅ Saved to ${outPath}`);
    console.log(`\nopen ${outPath}`);
  } finally {
    fetcher.close();
    chart.close();
  }
}

main().catch((err) => {
  console.error("❌ E2E test failed:", err.message);
  process.exit(1);
});
