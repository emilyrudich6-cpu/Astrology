// Short, chart-specific interpretations for the free chart, cached and rate-limited.
import Anthropic from "@anthropic-ai/sdk";
import { createHash } from "crypto";
import { ANTHROPIC_MODEL, BRAND } from "./config";
import { supabaseAdmin } from "./supabase";
import type { NatalChart } from "./engine/natal";
import type { DominantResult } from "./engine/dominant";

const DAILY_LIMIT = 12; // new interpretations per visitor per day (cached ones are free)

const memCache = new Map<string, string>();
const memHits = new Map<string, number>();
const dbReady = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

async function cached(key: string): Promise<string | null> {
  if (memCache.has(key)) return memCache.get(key)!;
  if (!dbReady()) return null;
  const { data } = await supabaseAdmin().from("free_cache").select("value").eq("key", key).maybeSingle();
  if (data?.value) memCache.set(key, data.value);
  return data?.value ?? null;
}
async function store(key: string, value: string) {
  memCache.set(key, value);
  if (dbReady()) await supabaseAdmin().from("free_cache").upsert({ key, value });
}

/** true if this visitor may generate another interpretation today */
async function allow(ip: string): Promise<boolean> {
  const ipHash = sha(ip + (process.env.CRON_SECRET ?? "vp")).slice(0, 32);
  const day = new Date().toISOString().slice(0, 10);
  if (!dbReady()) {
    const k = ipHash + day, n = (memHits.get(k) ?? 0) + 1;
    memHits.set(k, n);
    return n <= DAILY_LIMIT;
  }
  const db = supabaseAdmin();
  const { data } = await db.from("free_hits").select("count").eq("ip_hash", ipHash).eq("day", day).maybeSingle();
  const n = (data?.count ?? 0) + 1;
  if (n > DAILY_LIMIT) return false;
  await db.from("free_hits").upsert({ ip_hash: ipHash, day, count: n });
  return true;
}

const SYSTEM = `You write short astrology interpretations for ${BRAND.name}, framed as entertainment and self-reflection.
Use only the chart data provided; never invent positions, aspects, houses or dates. If a placement is marked uncertain, say so in a few words.
Voice: warm, direct, specific, a little poetic but never vague. Second person. No headings, no bullet points, no emoji. Plain paragraphs.
Don't mention data, software, AI or calculations. No medical, legal or financial advice; never promise outcomes.`;

async function write(prompt: string, maxTokens: number): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, system: SYSTEM, messages: [{ role: "user", content: prompt }] });
  return msg.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
}

export type FreeResult = { text: string } | { error: string };

function slim(c: NatalChart) {
  return {
    bigThree: c.bigThree, warnings: c.warnings,
    planets: c.planets.map(p => ({ name: p.name, position: p.position, house: p.house, retrograde: p.retrograde, dignity: p.dignity })),
    aspects: c.aspects.filter(a => a.major).slice(0, 14),
  };
}

export async function dominantText(birthKey: string, c: NatalChart, dom: DominantResult, uncertain: string[], ip: string): Promise<FreeResult> {
  const key = "dom2:" + sha(birthKey);
  const hit = await cached(key);
  if (hit) return { text: hit };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Interpretations switch on once the site's Claude key is added." };
  if (!(await allow(ip))) return { error: "You've explored a lot of charts today. Come back tomorrow for more interpretations." };
  const text = await write(
    `Write about this person's dominant planet: ${dom.planet}. In about 180 to 240 words, in three or four short paragraphs:
1) What ${dom.planet} is like in ${dom.sign}${dom.house ? ` in the ${dom.house}th house` : ""}, and what it means that it runs their chart.
2) Why it stands out, using these reasons in plain words: ${dom.reasons.join("; ")}.
3) Connect it to this real aspect: ${dom.keyAspect ? `${dom.planet} ${dom.keyAspect.aspect} ${dom.keyAspect.with} (orb ${dom.keyAspect.orb}°, ${dom.keyAspect.motion})` : "none"}${dom.house ? ` and to its house (${dom.house})` : " (birth time unknown, so skip houses)"}.
4) End with a final short paragraph that begins exactly "In plain English:" and gives one clear, practical takeaway.
Uncertain placements: ${uncertain.length ? uncertain.join(", ") : "none"}.
CHART: ${JSON.stringify(slim(c))}`, 750);
  await store(key, text);
  return { text };
}

const TOPIC_BRIEF: Record<string, string> = {
  love: "love and relationships: Venus, Mars, the Moon, the 5th and 7th houses and the Descendant when known",
  work: "work and purpose: the Midheaven and 10th house when known, Saturn, the Sun, the 6th house",
  growth: "personal growth: the North Node, Jupiter, Neptune, the 9th and 12th houses",
};

export async function topicText(birthKey: string, c: NatalChart, topic: "love" | "work" | "growth", uncertain: string[], ip: string, sample?: string | null): Promise<FreeResult> {
  const key = `topic:${topic}:` + sha(birthKey);
  const hit = await cached(key);
  if (hit) return { text: hit };
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Insights switch on once the site's Claude key is added." };
  if (!(await allow(ip))) return { error: "You've explored a lot of charts today. Come back tomorrow for more insights." };
  const text = await write(
    `Write one short insight (90 to 120 words, one or two paragraphs) about ${TOPIC_BRIEF[topic]} for this chart. Name the specific placements you draw on.${sample ? ` End with one sentence that points to this upcoming date from their timeline: ${sample}.` : ""}
Uncertain placements: ${uncertain.length ? uncertain.join(", ") : "none"}.
CHART: ${JSON.stringify(slim(c))}`, 400);
  await store(key, text);
  return { text };
}

export function clientIp(req: Request) {
  return (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}
