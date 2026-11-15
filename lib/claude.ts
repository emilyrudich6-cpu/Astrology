// The one place the site calls Claude. Current models think before answering by default, and that hidden
// thinking counts against max_tokens: with it on, free charts came back empty ("empty reply (stop_reason:
// max_tokens)") and readings took minutes. Everything the site writes is composed straight from chart data,
// so we ask for no up-front thinking, and fall back with extra room if a model doesn't accept that setting.
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "./config";

type Params = Omit<Anthropic.MessageCreateParamsNonStreaming, "model" | "thinking">;

export async function askClaude(params: Params): Promise<Anthropic.Message> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    return await client.messages.create({ ...params, model: ANTHROPIC_MODEL, thinking: { type: "between_tools" } });
  } catch (e) {
    if ((e as { status?: number })?.status !== 400) throw e;
    return await client.messages.create({ ...params, model: ANTHROPIC_MODEL, max_tokens: params.max_tokens + 8000 });
  }
}

export const textOf = (m: Anthropic.Message) => m.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
