/**
 * Layer 7 test (part 1): Verify LLM connection + tool-use decision making.
 * Sends metadata to the agent and checks it decides correct tv_chart params.
 * Does NOT actually call MCP — just verifies LLM reasoning.
 *
 * Run: bun agents/test-llm.ts
 */
import { Agent, run } from "@openai/agents";
import { resolveModel } from "./runtime/models.ts";
import { loadAgentFromFile } from "./runtime/parser.ts";
import { resolveNativeTools } from "./runtime/tools.ts";
import { resolve } from "path";

// Load agent definition
const parsed = await loadAgentFromFile(resolve(import.meta.dir, "definitions/chart-generator.md"));

// Create agent WITHOUT MCP (to test LLM reasoning only)
const agent = new Agent({
  name: "chart-generator-test",
  model: resolveModel(parsed.config.model),
  instructions: parsed.systemPrompt + `

IMPORTANT: For this test, do NOT actually call tv_chart. Instead, just output the JSON parameters you WOULD pass to tv_chart, along with your reasoning. Format:

REASONING: <why these params>
ENTRY_CHART_PARAMS: <json>
EXIT_CHART_PARAMS: <json or "N/A" for avoid cases>`,
  tools: resolveNativeTools(parsed.config.tools ?? []),
});

// Test with a real metadata case
const testMetadata = JSON.stringify({
  symbol: "LLOYDSENGG",
  date: "2023-05-15",
  timeframe: "weekly",
  label: "good_base",
  sub_label: "stage_2a",
  notes: "Lloyd Steel LSIL (NSE, weekly). Large S1 base with mini-base breakout as wake-up call. S2A, stage two early structure.",
  outcome: "worked",
  outcome_pct: null,
  outcome_duration_days: null,
}, null, 2);

const task = `Here is the metadata for case 012-LLOYDSENGG:

${testMetadata}

Based on this metadata, what tv_chart parameters would you use for the entry chart and exit chart? Just output your reasoning and the params — do NOT call any tools.`;

console.log("Sending to LLM...\n");

const result = await run(agent, task, { maxTurns: 1 });

console.log("=== LLM Response ===");
console.log(result.finalOutput);
