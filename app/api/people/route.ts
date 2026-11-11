import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { TIERS, Tier } from "@/lib/config";
import { surpriseDeliveryTime, startOfMemberMonth } from "@/lib/schedule";

const RELATIONSHIPS = ["partner", "crush", "ex", "friend", "family", "business partner", "coworker"];

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseBirth(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const relationship = RELATIONSHIPS.includes(body.relationship) ? body.relationship : "partner";
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("tier,timezone").eq("id", user.id).single();
  const max = p ? TIERS[p.tier as Tier].savedPeople : 0;
  if (!max) return NextResponse.json({ error: "Compatibility readings are part of the Deep Dive plan." }, { status: 403 });
  const { count: saved } = await db.from("people").select("id", { count: "exact", head: true }).eq("user_id", user.id);
  if ((saved ?? 0) >= max) return NextResponse.json({ error: `You can save up to ${max} people. Remove one first.` }, { status: 400 });
  const { count: thisMonth } = await db.from("readings").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("kind", "synastry").gte("created_at", startOfMemberMonth(p!.timezone));
  if ((thisMonth ?? 0) >= max) return NextResponse.json({ error: `You've used this month's ${max} compatibility readings. More open on the 1st.` }, { status: 429 });
  const { data: person, error } = await db.from("people").insert({ user_id: user.id, relationship, ...parsed.value }).select("id,name").single();
  if (error || !person) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  await db.from("readings").insert({
    user_id: user.id, kind: "synastry", person_id: person.id, title: `You & ${person.name}`,
    deliver_at: surpriseDeliveryTime(p!.timezone).toISOString(),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  await supabaseAdmin().from("people").delete().eq("id", id).eq("user_id", user.id);
  return NextResponse.json({ ok: true });
}
