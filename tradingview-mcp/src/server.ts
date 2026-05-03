/**
 * TradingView MCP Server
 *
 * Provides tv_scan and tv_stock tools via MCP protocol (stdio transport).
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
import { handleStock, closeStock } from "./tools/stock";

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

// --- tv_stock tool ---
server.tool(
  "tv_stock",
  "Get historical OHLCV bars + computed indicators + composite chart for a single NSE stock. Single call fetches both CVD datasets (native + custom TF) via dual-session batch. Output param controls what's returned: data JSON, chart PNG, or both (default). Replaces separate tv_data + tv_chart calls. Requires TV_SESSION_ID for CVD.",
  {
    symbol: z.string().describe("Stock symbol (e.g., 'RELIANCE' or 'NSE:RELIANCE')"),
    timeframe: z.enum(["1", "5", "15", "30", "60", "1D", "1W", "1M"]).optional().describe("Chart timeframe. Default: 1D"),
    count: z.number().optional().describe("Number of bars to fetch. Default: 300. Use 500+ for accurate EMA200."),
    output: z.array(z.enum(["data", "chart"])).optional().describe("What to return. Default: ['data', 'chart']. Use ['data'] for just indicators, ['chart'] for just the image."),
    toDate: z.string().optional().describe("End date (YYYY-MM-DD). Returns bars ending on this date. Default: latest available."),
    // Chart-specific params
    sma: z.number().optional().describe("SMA period for chart (0 to disable). Default: 20"),
    volumeMA: z.number().optional().describe("Volume MA period (0 to disable). Default: 30"),
    cvdTimeframe: z.string().optional().describe("Bottom CVD chart timeframe in minutes. Default: '188'"),
    cvdBars: z.number().optional().describe("Bottom CVD bar count. Default: 188"),
    cvdAnchor: z.string().optional().describe("CVD anchor/reset period. Default: '12M'"),
    cvdCustomTF: z.boolean().optional().describe("Use custom timeframe for bottom CVD. Default: true"),
    cvdResolution: z.string().optional().describe("CVD custom timeframe resolution. Default: '30S'"),
    savePath: z.string().optional().describe("Chart save folder. Default: /tmp/charts/"),
    width: z.number().optional().describe("Chart width in px. Default: 1200"),
    height: z.number().optional().describe("Chart height in px. Default: 1000"),
    theme: z.enum(["dark", "light"]).optional().describe("Chart color theme. Default: 'dark'"),
    paneRatios: z.array(z.number()).min(3).max(3).optional().describe("Top chart pane ratios [candles, volume, cvd]. Default: [0.65, 0.14, 0.21]"),
    panelWeights: z.array(z.number()).min(2).max(2).optional().describe("Panel weight ratio [top, bottom]. Default: [76, 24]"),
  },
  async (input) => {
    try {
      const result = await handleStock(fetcher, input as any);
      const content: Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> = [];

      // Data JSON
      if (result.data) {
        content.push({ type: "text", text: JSON.stringify(result.data, null, 2) });
      }

      // Chart image
      if (result.chart) {
        if (result.chart.image) {
          content.push({ type: "image", data: result.chart.image.toString("base64"), mimeType: "image/png" });
        }
        content.push({ type: "text", text: result.chart.path });
      }

      return { content };
    } catch (err: any) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
    }
  },
);

// --- Cleanup on exit ---
process.on("SIGINT", () => { fetcher.close(); closeStock(); process.exit(0); });
process.on("SIGTERM", () => { fetcher.close(); closeStock(); process.exit(0); });

// --- Start server ---
const transport = new StdioServerTransport();
await server.connect(transport);
