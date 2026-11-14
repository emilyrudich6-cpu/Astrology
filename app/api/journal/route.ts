import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { cleanEntry, ENTRY_FIELDS } from "@/lib/journal";
import { journalCap } from "@/lib/features";

/** Save a Seeing Numbers entry. The cap is enforced in the database, including simultaneous saves. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in to save entries." }, { status: 401 });
  const parsed = cleanEntry(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("id,tier").eq("id", user.id).maybeSingle();
  if (!profile) return NextResponse.json({ error: "Add your birth details first.", redirect: "/onboarding?next=/seeing-numbers" }, { status: 400 });
  const v = parsed.value;
  const { data: id, error } = await db.rpc("add_journal_entry", {
    p_user: user.id, p_cap: journalCap(profile.tier), p_raw: v.number_raw, p_norm: v.number_norm, p_seen_at: v.seen_at,
    p_local_date: v.seen_local_date, p_local_time: v.seen_local_time, p_tz: v.seen_tz, p_note: v.note, p_today: parsed.today,
  });
  if (error) {
    if (error.message?.includes("journal_cap_reached")) return NextResponse.json({ error: "cap" }, { status: 409 });
    console.error("journal save failed", error.code); // no journal text in logs
    return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  }
  const { data: entry } = await db.from("journal_entries").select(ENTRY_FIELDS).eq("id", id).eq("user_id", user.id).single();
  return NextResponse.json({ entry });
}
