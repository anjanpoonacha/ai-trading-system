/**
 * Step 2 test: view_image tool — LLM can see and describe a chart PNG.
 * Run: bun agents/test-vision.ts
 */
import { Agent, run } from "@openai/agents";
import { setTracingDisabled } from "@openai/agents-core";
import { resolveModel } from "./runtime/models.ts";
import { resolveNativeTools } from "./runtime/tools.ts";

setTracingDisabled(true);

const agent = new Agent({
  name: "vision-test",
  model: resolveModel("claude-sonnet-4-20250514"),
  instructions: "You can view images and describe what you see. Use the view_image tool to look at charts.",
  tools: resolveNativeTools(["view_image", "file_read"]),
});

const chartPath = "/Users/i548399/SAPDevelop/github.com/nse-trading-system/charts/cases/cds-examples/016-APOLLO-extended/entry.png";

const result = await run(agent, `Use view_image to look at the chart at ${chartPath}. Describe what you see: what stock, what pattern, is the SMA20 visible, does the CVD panel have data?`, {
  maxTurns: 3,
});

console.log("=== Vision Result ===");
console.log(result.finalOutput);
