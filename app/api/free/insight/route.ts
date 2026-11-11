import { NextResponse } from "next/server";
import { freeChart } from "@/lib/freechart-server";
import { topicText, clientIp } from "@/lib/free-ai";
import { timelineSample } from "@/lib/engine/dominant";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { b, topic } = await req.json().catch(() => ({}));
  if (!["love", "work", "growth"].includes(topic)) return NextResponse.json({ error: "Pick Love, Work or Personal Growth." }, { status: 400 });
  const fc = freeChart(typeof b === "string" ? b : null);
  if (!fc) return NextResponse.json({ error: "We couldn't read those birth details. Go back and enter them again." }, { status: 400 });
  const sample = topic === "love" ? null : timelineSample(fc.chart, topic);
  const sampleText = sample ? `${sample.date}: ${sample.transit} (${sample.area})` : null;
  try {
    const r = await topicText(fc.key, fc.chart, topic, fc.uncertain.map(u => `${u.planet} (${u.signs.join(" or ")})`), clientIp(req), sampleText);
    return NextResponse.json({ ...r, sample }, { status: "error" in r ? 429 : 200 });
  } catch (e) {
    console.error("free insight", e);
    return NextResponse.json({ error: "The insight didn't load. Try again in a minute.", sample }, { status: 502 });
  }
}
