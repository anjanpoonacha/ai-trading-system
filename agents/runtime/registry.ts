import { Agent, run } from "@openai/agents";
import { resolve } from "path";
import { readdirSync } from "fs";
import { loadAgentFromFile, type ParsedAgent } from "./parser.ts";
import { resolveModel } from "./models.ts";
import { resolveNativeTools, setDelegateExecutor } from "./tools.ts";
import { createMCPServer, loadMCPConfigs } from "./mcp.ts";
import type { MCPServerStdio } from "@openai/agents";

const DEFINITIONS_DIR = resolve(import.meta.dir, "../definitions");

export interface AgentEntry {
  parsed: ParsedAgent;
  agent: Agent;
  mcpServers: MCPServerStdio[];
}

/**
 * Load all agent definitions from the definitions/ directory.
 * Creates Agent instances with resolved models, tools, and MCP servers.
 */
export async function loadAllAgents(): Promise<Map<string, AgentEntry>> {
  const mcpConfigs = loadMCPConfigs();
  const registry = new Map<string, AgentEntry>();

  const files = readdirSync(DEFINITIONS_DIR).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const path = resolve(DEFINITIONS_DIR, file);
    const parsed = await loadAgentFromFile(path);
    const { config } = parsed;

    // Resolve MCP servers
    const mcpServers: MCPServerStdio[] = [];
    for (const serverName of config.mcp_servers ?? []) {
      const serverConfig = mcpConfigs[serverName];
      if (serverConfig) {
        mcpServers.push(createMCPServer(serverName, serverConfig));
      } else {
        console.warn(`Warning: MCP server "${serverName}" not found in mcp-servers.json`);
      }
    }

    // Resolve native tools
    const tools = resolveNativeTools(config.tools ?? []);

    // Create Agent instance
    const agent = new Agent({
      name: config.name,
      model: resolveModel(config.model),
      instructions: parsed.systemPrompt,
      mcpServers,
      tools,
    });

    registry.set(config.name, { parsed, agent, mcpServers });
  }

  return registry;
}

/**
 * Load a single agent by name.
 */
export async function loadAgent(name: string): Promise<AgentEntry | undefined> {
  const all = await loadAllAgents();
  return all.get(name);
}

/**
 * Wire up delegation: case-manager can call chart-generator, chart-reviewer, etc.
 * Must be called after loadAllAgents() to have the registry populated.
 */
export function wireDelegation(registry: Map<string, AgentEntry>) {
  setDelegateExecutor(async (agentName: string, task: string) => {
    const entry = registry.get(agentName);
    if (!entry) {
      throw new Error(`Agent '${agentName}' not found in registry`);
    }

    // Connect MCP servers for the sub-agent if not already connected
    for (const server of entry.mcpServers) {
      try { await server.connect(); } catch { /* already connected */ }
    }

    const result = await run(entry.agent, task, {
      maxTurns: entry.parsed.config.max_turns ?? 10,
    });

    return result.finalOutput;
  });
}
