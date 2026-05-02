/**
 * Layer 7 test: Full agentic loop on a real case with observability.
 * Run: bun agents/test-loop.ts
 */
import { Agent, run, MCPServerStdio } from "@openai/agents";
import { resolveModel } from "./runtime/models.ts";
import { loadAgentFromFile } from "./runtime/parser.ts";
import { resolveNativeTools } from "./runtime/tools.ts";
import { resolve } from "path";

const CASE_PATH = resolve(import.meta.dir, "../charts/cases/cds-examples/012-LLOYDSENGG");

// Load agent definition
console.log("Loading agent definition...");
const parsed = await loadAgentFromFile(resolve(import.meta.dir, "definitions/chart-generator.md"));

// Create MCP server
console.log("Creating MCP server...");
const tvServer = new MCPServerStdio({
  name: "tradingview",
  command: "bun",
  args: ["src/server.ts"],
  cwd: resolve(import.meta.dir, "../tradingview-mcp"),
  cacheToolsList: true,
});

console.log("Connecting MCP...");
await tvServer.connect();
console.log("MCP connected. Tools available.");

// Create agent with hooks
const tools = resolveNativeTools(parsed.config.tools ?? []);

const agent = new Agent({
  name: "chart-generator",
  model: resolveModel(parsed.config.model),
  instructions: parsed.systemPrompt,
  mcpServers: [tvServer],
  tools,
});

// Hook into agent lifecycle
agent.on("agent_start", () => {
  console.log("\n── Agent turn started ──");
});

agent.on("agent_tool_start", (_ctx, tool, { toolCall }) => {
  const args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
  // Truncate large values (like base64 content)
  const clean = Object.fromEntries(
    Object.entries(args).map(([k, v]) => [k, typeof v === "string" && v.length > 100 ? v.slice(0, 100) + "..." : v])
  );
  console.log(`  → ${tool.name}(${JSON.stringify(clean)})`);
});

agent.on("agent_tool_end", (_ctx, tool, result) => {
  const preview = result.length > 300 ? result.slice(0, 300) + `... [${result.length} chars]` : result;
  console.log(`  ← ${tool.name} → ${preview}`);
});

const task = `Generate entry and exit charts for the case at: ${CASE_PATH}

Steps:
1. Read ${CASE_PATH}/metadata.json
2. Decide chart parameters based on the pattern
3. Generate entry chart via tv_chart
4. Generate exit chart via tv_chart (if applicable)
5. Move old chart.png to reference/chart.png
6. Save new charts as entry.png and exit.png
7. Update metadata.json`;

console.log("\nRunning agent with task...");
console.log(`Task: ${task.split("\n")[0]}\n`);

try {
  const result = await run(agent, task, { maxTurns: 15 });
  console.log("\n=== Final Output ===");
  console.log(result.finalOutput);
} catch (err: any) {
  console.error("\n❌ Error:", err.message);
  if (err.data) console.error("Data:", JSON.stringify(err.data).slice(0, 500));
} finally {
  await tvServer.close();
  console.log("\nMCP closed. Done.");
}
