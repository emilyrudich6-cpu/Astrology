import { NextResponse } from "next/server";
import { currentUser, isAdmin, supabaseAdmin } from "@/lib/supabase";
import { runCycle, generateReading, deliverDue } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!isAdmin(user?.email)) return NextResponse.json({ error: "Admins only" }, { status: 403 });
  const { action, id } = await req.json().catch(() => ({}));
  const db = supabaseAdmin();
  if (action === "run") return NextResponse.json(await runCycle());
  if (action === "retry" && id) {
    await db.from("readings").update({ status: "scheduled", attempts: 0, error: null }).eq("id", id);
    await generateReading(id); await deliverDue();
    return NextResponse.json({ ok: true });
  }
  if (action === "send-now" && id) {
    await db.from("readings").update({ deliver_at: new Date().toISOString() }).eq("id", id).is("delivered_at", null);
    await generateReading(id); await deliverDue();
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
