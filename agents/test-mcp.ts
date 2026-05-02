/**
 * Layer 3 test: Spawn tradingview-mcp, discover tools, call tv_chart.
 * Run: bun agents/test-mcp.ts
 */
import { createMCPServer, loadMCPConfigs } from "./runtime/mcp.ts";

const configs = loadMCPConfigs();
console.log("MCP server configs:", Object.keys(configs));

const tvServer = createMCPServer("tradingview", configs["tradingview"]!);

console.log("\nConnecting to tradingview MCP server...");
await tvServer.connect();

console.log("Listing tools...");
const tools = await tvServer.listTools();
console.log(`Found ${tools.length} tools:`);
for (const tool of tools) {
  console.log(`  - ${tool.name}: ${tool.description?.slice(0, 80)}...`);
}

console.log("\nCalling tv_chart for NSE:RELIANCE (daily, 100 bars)...");
const result = await tvServer.callTool("tv_chart", {
  symbols: ["NSE:RELIANCE"],
  timeframe: "1D",
  bars: 100,
  sma: 20,
  theme: "dark",
  savePath: "/tmp/charts-test/",
});

console.log("\nResult:");
for (const item of result) {
  if (item.type === "text") {
    console.log(`  [text] ${item.text}`);
  } else if (item.type === "image") {
    console.log(`  [image] ${(item.data as string).length} chars base64`);
  }
}

console.log("\nClosing MCP server...");
await tvServer.close();
console.log("Done.");
