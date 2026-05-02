import { aisdk } from "@openai/agents-extensions/ai-sdk";
import { createOpenAI } from "@ai-sdk/openai";
import type { Model } from "@openai/agents";

/**
 * Local AI proxy at localhost:3030 — OpenAI-compatible endpoint.
 * Supports Claude, GPT, Gemini models. No API key needed.
 */
const proxy = createOpenAI({
  baseURL: "http://localhost:3030/v1",
  apiKey: "not-needed",
  compatibility: "compatible",
});

/**
 * Resolve a model string from agent config to an actual Model instance.
 * All models route through the local OpenAI-compatible proxy (chat completions).
 */
export function resolveModel(modelName: string): Model {
  return aisdk(proxy.chat(modelName));
}
