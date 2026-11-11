import { NextResponse } from "next/server";
import { runCycle } from "@/lib/pipeline";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// Vercel calls this every 15 minutes (see vercel.json; needs the Vercel Pro plan).
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` || !process.env.CRON_SECRET)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runCycle());
}
