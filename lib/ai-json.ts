// Ask Claude for a reading as structured JSON (tool use), so each section lands
// next to the calculated table it belongs to.
import type Anthropic from "@anthropic-ai/sdk";
import { askClaude } from "./claude";

type Schema = Record<string, any>;

export const str = (description: string) => ({ type: "string", description });
export const strArr = (description: string) => ({ type: "array", items: { type: "string" }, description });
export const obj = (properties: Record<string, any>, description?: string) => ({
  type: "object", properties, required: Object.keys(properties), ...(description ? { description } : {}),
});
export const arr = (properties: Record<string, any>, description: string) => ({ type: "array", items: obj(properties), description });

/** Calls Claude with one forced tool and returns its input. Throws on an empty or malformed reply. */
export async function writeJSON<T>(system: string, task: string, data: unknown, schema: Schema, maxTokens = 8000,
  dryHints: Record<string, string[]> = {}): Promise<T> {
  if (process.env.READINGS_DRY_RUN) return placeholder(schema, dryHints) as T;
  // Current models reject a forced tool call ("tool_choice: tool is not supported for this model"), which made
  // every Full Chart and synastry reading fail. We let the model choose and tell it plainly to call the tool.
  const first = { role: "user" as const, content: `${task}\n\nCHART DATA (JSON):\n${JSON.stringify(data)}` };
  const ask = (extra: string) => askClaude({
    max_tokens: maxTokens,
    system: `${system}\n\nReturn the reading only by calling the write_reading tool, once, with every field filled in. Do not reply in plain text.`,
    tools: [{ name: "write_reading", description: "Return the written sections of the reading.", input_schema: schema as any }],
    tool_choice: { type: "auto" },
    messages: extra ? [first, { role: "user", content: extra }] : [first],
  });
  const pick = (m: Anthropic.Message) => m.content.find(b => b.type === "tool_use") as any;
  let msg = await ask("");
  // Free to choose, the model can answer in prose instead. Ask once more before giving up.
  if (!pick(msg)) msg = await ask("Call the write_reading tool now with the complete reading.");
  const block = pick(msg);
  if (!block?.input || typeof block.input !== "object" || !Object.keys(block.input).length)
    throw new Error(`empty reply (stop_reason: ${msg.stop_reason})`);
  if (msg.stop_reason === "max_tokens") throw new Error("reply was cut off (max_tokens)");
  return block.input as T;
}

/** Stand-in text for previews without an API key: fills every field so the layout can be checked. */
function placeholder(schema: Schema, hints: Record<string, string[]>, key = ""): any {
  if (schema.type === "string" && schema.enum) return schema.enum[0];
  if (schema.type === "string") return `Written section: ${schema.description ?? key}`.slice(0, 160);
  if (schema.type === "number" || schema.type === "integer") return 0;
  if (schema.type === "array") {
    const ids = hints[key];
    const n = ids?.length ?? 3;
    return Array.from({ length: n }, (_, i) => {
      const item = placeholder(schema.items, hints, key);
      if (ids && item && typeof item === "object" && "id" in item) item.id = ids[i];
      return item;
    });
  }
  if (schema.type === "object") {
    const o: any = {};
    for (const [k, v] of Object.entries(schema.properties ?? {})) o[k] = placeholder(v as Schema, hints, k);
    return o;
  }
  return null;
}
