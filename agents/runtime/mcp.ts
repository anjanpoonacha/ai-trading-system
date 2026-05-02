import { MCPServerStdio } from "@openai/agents";
import { resolve } from "path";

export interface MCPServerConfig {
  command: string;
  args: string[];
  cwd?: string;
}

const AGENTS_DIR = resolve(import.meta.dir, "..");

/**
 * Load MCP server configs from mcp-servers.json
 */
export function loadMCPConfigs(): Record<string, MCPServerConfig> {
  const configPath = resolve(AGENTS_DIR, "mcp-servers.json");
  const raw = JSON.parse(require("fs").readFileSync(configPath, "utf8"));
  return raw as Record<string, MCPServerConfig>;
}

/**
 * Create an MCPServerStdio instance from config.
 * Does NOT connect — caller must call connect() or let the Agent SDK handle it.
 */
export function createMCPServer(name: string, config: MCPServerConfig): MCPServerStdio {
  const cwd = config.cwd ? resolve(AGENTS_DIR, config.cwd) : undefined;

  return new MCPServerStdio({
    name,
    command: config.command,
    args: config.args,
    cwd,
    cacheToolsList: true,
  });
}

/**
 * Create all MCP servers from config file.
 */
export function createAllMCPServers(): Record<string, MCPServerStdio> {
  const configs = loadMCPConfigs();
  const servers: Record<string, MCPServerStdio> = {};

  for (const [name, config] of Object.entries(configs)) {
    servers[name] = createMCPServer(name, config);
  }

  return servers;
}
