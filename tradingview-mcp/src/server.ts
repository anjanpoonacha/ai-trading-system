/**
 * TradingView MCP Server
 *
 * Provides tv_scan and tv_data tools via MCP protocol (stdio transport).
 * Long-lived process — WebSocket connections persist between tool calls.
 *
 * Launch: bun src/server.ts
 * Config in MCP client:
 * {
 *   "mcpServers": {
 *     "tradingview": {
 *       "command": "bun",
 *       "args": ["run", "/path/to/tradingview-mcp/src/server.ts"],
 *       "env": { "TV_SESSION_ID": "...", "TV_SESSION_SIGN": "..." }
 *     }
 *   }
 * }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createFetcher } from "./services/fetcher";
import { handleScan } from "./tools/scan";
import { handleData } from "./tools/data";
import { handleChart, closeChart } from "./tools/chart";

const fetcher = createFetcher();

const server = new McpServer({
  name: "tradingview",
  version: "0.1.0",
});

// --- tv_scan tool ---
server.tool(
  "tv_scan",
  "Get snapshot indicator data for multiple NSE stocks via TradingView Scanner API. Returns current values for price, SMAs, RSI, volume, sector, market cap, etc. No auth needed.",
  {
    symbols: z.array(z.string()).describe("Stock symbols (e.g., ['RELIANCE', 'TCS', 'INFY']). NSE: prefix auto-added."),
    columns: z.array(z.string()).optional().describe("Columns to fetch. Defaults to common indicators."),
  },
  async ({ symbols, columns }) => {
    try {
      const results = await handleScan(fetcher, { symbols, columns });
      return { content: [{ type: "text", text: JSON.stringify(results, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  },
);

// --- tv_data tool ---
server.tool(
  "tv_data",
  "Get historical OHLCV bars + computed indicators for a single NSE stock. Fetches from TradingView WebSocket (~90ms). Computes SMA, EMA, volume averages, slopes, volume contraction, base depth, TRP, ADT locally — all validated to match TradingView's values exactly. Use count >= 500 for accurate EMA200 (needs warmup). Optionally includes CVD (requires auth).",
  {
    symbol: z.string().describe("Stock symbol (e.g., 'RELIANCE' or 'NSE:RELIANCE')"),
    timeframe: z.enum(["1", "5", "15", "30", "60", "1D", "1W", "1M"]).optional().describe("Chart timeframe. Default: 1D"),
    count: z.number().optional().describe("Number of bars to fetch. Default: 300. Use 500+ for accurate EMA200."),
    cvd: z.boolean().optional().describe("Include CVD indicator (requires TV_SESSION_ID env). Default: false"),
  },
  async ({ symbol, timeframe, count, cvd }) => {
    try {
      const result = await handleData(fetcher, { symbol, timeframe, count, cvd });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  },
);

// --- tv_chart tool ---
server.tool(
  "tv_chart",
  "Generate composite candlestick chart images for NSE stocks. Accepts one or many symbols. Produces multi-panel PNGs: top panel has candles + SMA20 + volume + CVD, bottom panel shows CVD at intraday resolution. Uses dual-session batch for efficient parallel processing. Requires TV_SESSION_ID for CVD.",
  {
    symbols: z.array(z.string()).describe("Stock symbols (e.g., ['RELIANCE', 'TCS', 'INFY'])"),
    timeframe: z.string().optional().describe("Top chart timeframe. Default: '1D'"),
    bars: z.number().optional().describe("Number of bars. Default: 188"),
    sma: z.number().optional().describe("SMA period (0 to disable). Default: 20"),
    cvdTimeframe: z.string().optional().describe("Bottom CVD chart timeframe in minutes. Default: '188'"),
    cvdBars: z.number().optional().describe("Bottom CVD bar count. Default: 188"),
    cvdAnchor: z.string().optional().describe("CVD anchor/reset period. Default: '12M'"),
    cvdCustomTF: z.boolean().optional().describe("Use custom timeframe for bottom CVD. Default: true"),
    cvdResolution: z.string().optional().describe("CVD custom timeframe resolution. Default: '30S'"),
    toDate: z.string().optional().describe("End date for chart (YYYY-MM-DD). Shows chart as of this date. Default: latest available."),
    savePath: z.string().optional().describe("Save folder. Default: /tmp/charts/. Files named {SYMBOL}-{TF}-{YYYY-MM-DD}.png"),
    width: z.number().optional().describe("Image width in px. Default: 1200"),
    height: z.number().optional().describe("Image height in px. Default: 1000"),
    theme: z.enum(["dark", "light"]).optional().describe("Color theme. Default: 'dark'"),
    paneRatios: z.tuple([z.number(), z.number(), z.number()]).optional().describe("Top chart pane ratios [candles, volume, cvd]. Default: [0.65, 0.14, 0.21]"),
    panelWeights: z.tuple([z.number(), z.number()]).optional().describe("Panel weight ratio [top, bottom]. Default: [76, 24]"),
  },
  async (input) => {
    try {
      const MAX_INLINE = 5;
      const output = await handleChart(fetcher, input);
      const okResults = output.results.filter((r) => r.ok);
      const failedResults = output.results.filter((r) => !r.ok);

      const content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];

      // Summary text
      const summary = [
        `${output.stats.ok}/${output.stats.total} charts | ${(output.stats.totalMs / 1000).toFixed(1)}s | ${output.stats.avgMs}ms/chart`,
        ...(failedResults.length > 0 ? [`Failed: ${failedResults.map((r) => `${r.symbol}: ${r.error}`).join(", ")}`] : []),
      ].join("\n");
      content.push({ type: "text", text: summary });

      // Inline images: all if ≤5, otherwise just the first
      const inlineCount = okResults.length <= MAX_INLINE ? okResults.length : 1;
      for (let i = 0; i < inlineCount; i++) {
        if (okResults[i].image) {
          content.push({ type: "image", data: okResults[i].image!.toString("base64"), mimeType: "image/png" });
        }
      }

      // File paths for the rest
      if (okResults.length > MAX_INLINE) {
        content.push({ type: "text", text: okResults.map((r) => r.path).join("\n") });
      } else {
        content.push({ type: "text", text: okResults.map((r) => r.path).join("\n") });
      }

      return { content };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  },
);

// --- Cleanup on exit ---
process.on("SIGINT", () => { fetcher.close(); closeChart(); process.exit(0); });
process.on("SIGTERM", () => { fetcher.close(); closeChart(); process.exit(0); });

// --- Start server ---
const transport = new StdioServerTransport();
await server.connect(transport);
