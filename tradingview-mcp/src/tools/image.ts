/**
 * tv_image tool — render chart image for a symbol
 *
 * Composition: Fetcher → Renderer → PNG
 *
 * NOT IMPLEMENTED YET — Phase 2
 */

import type { Fetcher } from "../services/fetcher";
import type { Overlay, RenderOptions } from "../services/renderer";
import { renderChart } from "../services/renderer";

export interface ImageInput {
  symbol: string;
  timeframe?: string;
  count?: number;
  overlays?: Overlay[];
  options?: RenderOptions;
}

export async function handleImage(fetcher: Fetcher, input: ImageInput) {
  const symbol = input.symbol;
  const timeframe = input.timeframe || "1D";
  const count = input.count || 300;
  const overlays = input.overlays || [{ type: "sma" as const, period: 20 }, { type: "volume" as const }];
  const options = input.options || {};

  const { bars } = await fetcher.getBars(symbol, timeframe, count);
  const result = await renderChart(bars, overlays, options);

  return result;
}
