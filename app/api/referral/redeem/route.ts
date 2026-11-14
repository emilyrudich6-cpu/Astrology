import { NextResponse, after } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { FEATURES } from "@/lib/features";
import { generateReading, deliverDue } from "@/lib/pipeline";

export const maxDuration = 300; // the reading is written right after this responds

/** Use the free synastry reading earned by an invite. Safe to call twice: never creates a second reading,
 *  and a reading that failed to write is retried instead of costing the credit. */
export async function POST() {
  if (!FEATURES.referrals) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data, error } = await supabaseAdmin().rpc("redeem_referral", { p_inviter: user.id });
  if (error) {
    const m = error.message ?? "";
    if (m.includes("no_credit")) return NextResponse.json({ error: "You don't have a free reading to use yet." }, { status: 400 });
    if (m.includes("not_shared")) return NextResponse.json({ error: "Your friend hasn't shared their chart yet." }, { status: 400 });
    if (m.includes("friend_no_chart")) return NextResponse.json({ error: "Your friend's chart isn't ready yet." }, { status: 400 });
    console.error("redeem failed", error.code);
    return NextResponse.json({ error: "Couldn't start it. Try again." }, { status: 500 });
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (row?.out_outcome === "started" || row?.out_outcome === "retry")
    after(async () => { await generateReading(row.out_reading_id); await deliverDue(); });
  return NextResponse.json({ ok: true, readingId: row?.out_reading_id, outcome: row?.out_outcome });
}
