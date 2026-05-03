import { tool, Agent, run } from "@openai/agents";
import { setTracingDisabled } from "@openai/agents-core";
import { z } from "zod";
import { resolve, dirname } from "path";
import { mkdirSync, existsSync, renameSync } from "fs";

setTracingDisabled(true);

/**
 * Native tools provided by the framework.
 * These are available to all agents that declare them in their config.
 */

export const fileRead = tool({
  name: "file_read",
  description: "Read a file's contents. Returns text for text files, base64 for binary files.",
  parameters: z.object({
    path: z.string().describe("Absolute or relative path to the file"),
  }),
  async execute({ path: filePath }) {
    const file = Bun.file(filePath);
    if (!(await file.exists())) {
      return `Error: File not found: ${filePath}`;
    }
    const type = file.type;
    // Text-like types: return as string
    if (type.startsWith("text/") || type.includes("json") || type.includes("xml") || type.includes("javascript")) {
      return await file.text();
    }
    // Binary: return size info (don't try to return base64 — too large for tool params)
    const buf = await file.arrayBuffer();
    return `[binary file: ${type}, ${buf.byteLength} bytes at ${filePath}]`;
  },
});

export const fileWrite = tool({
  name: "file_write",
  description: "Write content to a file. Creates parent directories if needed. For binary, provide base64 content with encoding='base64'.",
  parameters: z.object({
    path: z.string().describe("Absolute path to write to"),
    content: z.string().describe("File content (text or base64)"),
    encoding: z.enum(["utf8", "base64"]).optional().describe("Content encoding. Default: utf8"),
  }),
  async execute({ path: filePath, content, encoding }) {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    if (encoding === "base64") {
      await Bun.write(filePath, Buffer.from(content, "base64"));
    } else {
      await Bun.write(filePath, content);
    }
    return `Written: ${filePath}`;
  },
});

export const fileMove = tool({
  name: "file_move",
  description: "Move/rename a file. Creates destination directory if needed.",
  parameters: z.object({
    from: z.string().describe("Source file path"),
    to: z.string().describe("Destination file path"),
  }),
  async execute({ from, to }) {
    if (!existsSync(from)) {
      return `Error: Source not found: ${from}`;
    }
    const destDir = dirname(to);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    renameSync(from, to);
    return `Moved: ${from} → ${to}`;
  },
});

export const fileCopy = tool({
  name: "file_copy",
  description: "Copy a file from source to destination. Creates destination directory if needed.",
  parameters: z.object({
    from: z.string().describe("Source file path"),
    to: z.string().describe("Destination file path"),
  }),
  async execute({ from, to }) {
    if (!existsSync(from)) {
      return `Error: Source not found: ${from}`;
    }
    const destDir = dirname(to);
    if (!existsSync(destDir)) {
      mkdirSync(destDir, { recursive: true });
    }
    const content = await Bun.file(from).arrayBuffer();
    await Bun.write(to, content);
    return `Copied: ${from} → ${to}`;
  },
});

export const viewImage = tool({
  name: "view_image",
  description: "View an image file for visual analysis. Returns the image so you can see and evaluate it.",
  parameters: z.object({
    path: z.string().describe("Path to the image file (PNG, JPG)"),
  }),
  async execute({ path: filePath }) {
    if (!existsSync(filePath)) {
      return `Error: Image not found: ${filePath}`;
    }
    const buf = await Bun.file(filePath).arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    // Return as image content for the LLM to see
    return [
      { type: "image" as const, image: { data: base64, mediaType: "image/png" } },
      { type: "text" as const, text: `Image loaded: ${filePath} (${buf.byteLength} bytes)` },
    ];
  },
});

// Delegate tool requires lazy loading to avoid circular deps
// It's wired up in registry.ts after agents are loaded
export let delegateExecutor: ((agent: string, task: string) => Promise<string>) | null = null;

export function setDelegateExecutor(fn: (agent: string, task: string) => Promise<string>) {
  delegateExecutor = fn;
}

export const delegate = tool({
  name: "delegate",
  description: "Delegate a subtask to another specialized agent. The agent runs autonomously and returns its result.",
  parameters: z.object({
    agent: z.string().describe("Name of the agent to delegate to (e.g., 'chart-generator', 'chart-reviewer')"),
    task: z.string().describe("Detailed task description for the sub-agent"),
  }),
  async execute({ agent, task }) {
    if (!delegateExecutor) {
      return "Error: Delegate executor not initialized. Make sure agents are loaded via registry.";
    }
    try {
      return await delegateExecutor(agent, task);
    } catch (err: any) {
      return `Delegation to '${agent}' failed: ${err.message}`;
    }
  },
});

/**
 * Get all native tools as a record for agent registration.
 */
export const nativeTools = {
  file_read: fileRead,
  file_write: fileWrite,
  file_move: fileMove,
  file_copy: fileCopy,
  view_image: viewImage,
  delegate: delegate,
} as const;

/**
 * Resolve tool names from agent config to actual tool instances.
 */
export function resolveNativeTools(toolNames: string[]) {
  const resolved: Record<string, typeof fileRead> = {};
  for (const name of toolNames) {
    const t = nativeTools[name as keyof typeof nativeTools];
    if (t) {
      resolved[name] = t;
    }
  }
  return Object.values(resolved);
}
