import { Agent } from "@openai/agents";
import { resolve } from "path";
import { readdirSync } from "fs";
import { loadAgentFromFile, type ParsedAgent } from "./parser.ts";
import { resolveModel } from "./models.ts";
import { resolveNativeTools } from "./tools.ts";
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
