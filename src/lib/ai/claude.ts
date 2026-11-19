import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// One Claude API key held by Ebop (brief §6); users never supply keys.
let client: Anthropic | null = null;

export function claude() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("Missing ANTHROPIC_API_KEY. Add it to .env.local (server only, no NEXT_PUBLIC_ prefix).");
  }
  client ??= new Anthropic();
  return client;
}

// Brief §6: experts on Sonnet; panelists, recaps and summaries on Haiku.
export const EXPERT_MODEL = "claude-sonnet-5-5";
export const LIGHT_MODEL = "claude-haiku-5-5";
