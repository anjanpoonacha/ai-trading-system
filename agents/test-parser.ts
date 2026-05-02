/**
 * Layer 2 test: Parse agent .md file → config + system prompt
 * Run: bun agents/test-parser.ts
 */
import { loadAgentFromFile } from "./runtime/parser.ts";
import { resolve } from "path";

const agentPath = resolve(import.meta.dir, "definitions/chart-generator.md");

console.log(`Parsing: ${agentPath}\n`);

const { config, systemPrompt } = await loadAgentFromFile(agentPath);

console.log("=== Config ===");
console.log(JSON.stringify(config, null, 2));

console.log("\n=== System Prompt (first 500 chars) ===");
console.log(systemPrompt.slice(0, 500));
console.log(`\n... (${systemPrompt.length} total chars)`);
