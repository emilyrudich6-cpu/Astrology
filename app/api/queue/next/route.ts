import { NextResponse, after } from "next/server";
import { nextInLine, writeNow } from "@/lib/pipeline";

export const maxDuration = 300; // the Deep Dive is written right after this responds
export const dynamic = "force-dynamic";

/** Called by the site itself when a Deep Dive finishes: starts the next one waiting in line. */
export async function POST(req: Request) {
  if (!process.env.CRON_SECRET || req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = await nextInLine();
  if (id) after(() => writeNow([id]));
  return NextResponse.json({ started: !!id });
}
