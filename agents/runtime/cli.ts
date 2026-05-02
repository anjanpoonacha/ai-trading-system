/**
 * CLI entry point for the agent framework.
 * Usage: bun agents/runtime/cli.ts <agent-name> "<task description>"
 */
import { run } from "@openai/agents";
import { loadAgent } from "./registry.ts";

const [agentName, ...taskParts] = process.argv.slice(2);
const task = taskParts.join(" ");

if (!agentName || !task) {
  console.error("Usage: bun agents/runtime/cli.ts <agent-name> \"<task>\"");
  console.error("Example: bun agents/runtime/cli.ts chart-generator \"Generate charts for charts/cases/cds-examples/012-LLOYDSENGG\"");
  process.exit(1);
}

console.log(`Agent: ${agentName}`);
console.log(`Task: ${task}\n`);

const entry = await loadAgent(agentName);
if (!entry) {
  console.error(`Agent "${agentName}" not found. Available agents are in definitions/ folder.`);
  process.exit(1);
}

const { agent, mcpServers } = entry;

// Connect MCP servers
for (const server of mcpServers) {
  console.log(`Connecting MCP: ${server.name}...`);
  await server.connect();
}

try {
  console.log("Running agent...\n");
  const result = await run(agent, task, {
    maxTurns: entry.parsed.config.max_turns ?? 8,
  });

  console.log("\n=== Agent Output ===");
  console.log(result.finalOutput);
} catch (err: any) {
  console.error("\nAgent error:", err.message);
  if (err.cause) console.error("Cause:", err.cause);
} finally {
  // Close MCP servers
  for (const server of mcpServers) {
    await server.close();
  }
}
