import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { SAVED_FRIENDS_MAX, RELATIONSHIPS } from "@/lib/friends";

/** Save a friend's birth details to the signed-in member's account, or update one (when `id` is sent).
 *  Saving never starts or charges for a reading. Every query is limited to the member's own rows. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseBirth(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const relationship = RELATIONSHIPS.includes(body.relationship) ? body.relationship : "friend";
  const db = supabaseAdmin();
  if (typeof body.id === "string" && body.id) {
    const { data: row } = await db.from("people").update({ relationship, ...parsed.value })
      .eq("id", body.id).eq("user_id", user.id).eq("purchased", false).select("id").maybeSingle();
    return row ? NextResponse.json({ ok: true, id: row.id }) : NextResponse.json({ error: "We couldn't find that friend." }, { status: 404 });
  }
  const { count } = await db.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("purchased", false);
  if ((count ?? 0) >= SAVED_FRIENDS_MAX) return NextResponse.json({ error: `You can save up to ${SAVED_FRIENDS_MAX} friends. Remove one first.` }, { status: 400 });
  const { data: row, error } = await db.from("people").insert({ user_id: user.id, relationship, ...parsed.value }).select("id").single();
  if (error || !row) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true, id: row.id });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Choose a friend." }, { status: 400 });
  await supabaseAdmin().from("people").delete().eq("id", id).eq("user_id", user.id).eq("purchased", false);
  return NextResponse.json({ ok: true });
}
