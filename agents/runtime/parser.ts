import matter from "gray-matter";

export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  vision?: boolean;
  max_turns?: number;
  mcp_servers?: string[];
  tools?: string[];
  delegates?: string[];
}

export interface ParsedAgent {
  config: AgentConfig;
  systemPrompt: string;
}

export function parseAgentMd(content: string): ParsedAgent {
  const { data, content: body } = matter(content);

  const config: AgentConfig = {
    name: data.name ?? "unnamed",
    description: data.description ?? "",
    model: data.model ?? "claude-sonnet-4-20250514",
    vision: data.vision ?? false,
    max_turns: data.max_turns ?? 8,
    mcp_servers: data.mcp_servers ?? [],
    tools: data.tools ?? [],
    delegates: data.delegates ?? [],
  };

  return { config, systemPrompt: body.trim() };
}

export async function loadAgentFromFile(path: string): Promise<ParsedAgent> {
  const content = await Bun.file(path).text();
  return parseAgentMd(content);
}
