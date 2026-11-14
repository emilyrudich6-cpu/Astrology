import { NextResponse, after } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { writeNow, STUCK_MINUTES } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300; // the reading is written right after this responds

/** Try writing a reading again. No payment involved: it restarts the member's own reading that failed or stalled. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const db = supabaseAdmin();
  const { data: r } = await db.from("readings").select("id,status,claimed_at,delivered_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!r) return NextResponse.json({ error: "We couldn't find that reading." }, { status: 404 });
  if (r.delivered_at || r.status === "ready") return NextResponse.json({ ok: true, ready: true });
  const stalled = r.status === "generating" && (!r.claimed_at || Date.now() - new Date(r.claimed_at).getTime() > STUCK_MINUTES * 60000);
  if (r.status === "generating" && !stalled) return NextResponse.json({ ok: true, writing: true }); // already being written
  if (r.status === "failed" || stalled) {
    // Only one request wins this update, so two taps can't start it twice
    const { data: reset } = await db.from("readings").update({ status: "scheduled", attempts: 0, error: null, deliver_at: new Date().toISOString() })
      .eq("id", id).eq("status", r.status).select("id").maybeSingle();
    if (!reset) return NextResponse.json({ ok: true, writing: true });
  }
  after(() => writeNow([id]));
  return NextResponse.json({ ok: true, started: true });
}
