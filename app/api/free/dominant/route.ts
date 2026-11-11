import { NextResponse } from "next/server";
import { freeChart } from "@/lib/freechart-server";
import { dominantText, clientIp } from "@/lib/free-ai";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const { b } = await req.json().catch(() => ({}));
  const fc = freeChart(typeof b === "string" ? b : null);
  if (!fc) return NextResponse.json({ error: "We couldn't read those birth details. Go back and enter them again." }, { status: 400 });
  try {
    const r = await dominantText(fc.key, fc.chart, fc.dominant, fc.uncertain.map(u => `${u.planet} (${u.signs.join(" or ")})`), clientIp(req));
    return NextResponse.json(r, { status: "error" in r ? 429 : 200 });
  } catch (e) {
    console.error("free dominant", e);
    return NextResponse.json({ error: "The interpretation didn't load. Try again in a minute." }, { status: 502 });
  }
}
