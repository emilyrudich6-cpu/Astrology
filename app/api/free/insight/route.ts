import { NextResponse } from "next/server";
import { freeChart } from "@/lib/freechart-server";
import { topicText, clientIp } from "@/lib/free-ai";
import { timelineSample } from "@/lib/engine/dominant";
import { topicFallback } from "@/lib/topic-fallback";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { b, topic } = await req.json().catch(() => ({}));
  if (!["love", "work", "growth"].includes(topic)) return NextResponse.json({ error: "Pick Love, Work or Personal Growth." }, { status: 400 });
  const fc = freeChart(typeof b === "string" ? b : null);
  if (!fc) return NextResponse.json({ error: "We couldn't read those birth details. Go back and enter them again." }, { status: 400 });
  const sample = timelineSample(fc.chart, topic);
  const fallback = topicFallback(fc.chart, topic, fc.uncertainNames);
  const sampleText = sample ? `${sample.date}: ${sample.transit} (${sample.area})` : null;
  try {
    const r = await topicText(fc.key, fc.chart, topic, fc.uncertain.map(u => `${u.planet} (${u.signs.join(" or ")})`), clientIp(req), sampleText);
    // No Claude key or daily limit reached: still give a real, chart-specific insight
    return NextResponse.json("text" in r ? { ...r, sample } : { text: fallback, sample });
  } catch (e) {
    console.error("free insight", e);
    return NextResponse.json({ text: fallback, sample });
  }
}
