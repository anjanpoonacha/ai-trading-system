/**
 * Renderer Service — converts bars + indicators into chart images
 *
 * Takes OHLCV bars + overlay config → produces PNG buffer.
 * Stateless, pure transformation.
 *
 * NOT IMPLEMENTED YET — Phase 2
 *
 * Possible approaches:
 * - lightweight-charts (headless render via puppeteer/playwright)
 * - node-canvas / skia-canvas (direct drawing)
 * - SVG generation → sharp/resvg for PNG
 *
 * Run standalone: bun src/services/renderer.ts
 */

import type { Bar, CVDPoint } from "../types";

export interface Overlay {
  type: "sma" | "ema" | "volume" | "cvd" | "bb";
  period?: number;
  color?: string;
  data?: number[] | CVDPoint[];
}

export interface RenderOptions {
  width?: number;
  height?: number;
  title?: string;
  theme?: "light" | "dark";
}

export interface RenderResult {
  image: Buffer;
  mimeType: "image/png";
}

export async function renderChart(
  _bars: Bar[],
  _overlays: Overlay[],
  _options: RenderOptions,
): Promise<RenderResult> {
  throw new Error("Renderer not implemented yet (Phase 2)");
}

// --- Standalone test ---
if (import.meta.main) {
  console.log("Renderer service — NOT IMPLEMENTED YET (Phase 2)\n");
  console.log("Planned interface:");
  console.log("  renderChart(bars, overlays, options) → { image: Buffer, mimeType: 'image/png' }");
  console.log("\nOverlay types: sma, ema, volume, cvd, bb");
  console.log("Options: width, height, title, theme");
}
