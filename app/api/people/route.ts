import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { TIERS, Tier } from "@/lib/config";
import { startIncludedReading } from "@/lib/compat";

export const maxDuration = 300; // the reading is written right after this responds
const RELATIONSHIPS = ["partner", "crush", "ex", "friend", "family", "business partner", "coworker"];

/** Save someone to Your People and start your compatibility reading with them. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseBirth(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const relationship = RELATIONSHIPS.includes(body.relationship) ? body.relationship : "partner";
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("tier").eq("id", user.id).single();
  const max = p ? TIERS[p.tier as Tier].savedPeople : 0;
  if (!max) return NextResponse.json({ error: "Your People is part of Deep Dive." }, { status: 403 });
  const { count: saved } = await db.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("purchased", false);
  if ((saved ?? 0) >= max) return NextResponse.json({ error: `You can save up to ${max} people. Remove one first.` }, { status: 400 });
  const { data: person, error } = await db.from("people").insert({ user_id: user.id, relationship, ...parsed.value }).select("id").single();
  if (error || !person) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  const r = await startIncludedReading(user.id, person.id);
  return NextResponse.json(r.ok ? r : { error: r.error }, { status: r.ok ? 200 : r.status });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  await supabaseAdmin().from("people").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
