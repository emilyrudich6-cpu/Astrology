// Members' compatibility readings: 5 a month included, then $3.99 each.
import { after } from "next/server";
import { supabaseAdmin } from "./supabase";
import { TIERS, Tier } from "./config";
import { planUsedThisMonth } from "./quota";
import { generateReading, deliverDue } from "./pipeline";

export type CompatResult = { ok: true; started: true } | { ok: true; needsExtra: true; personId: string } | { ok: false; error: string; status: number };

/** Starts a compatibility reading with a saved person if the member has one left this month. */
export async function startIncludedReading(userId: string, personId: string): Promise<CompatResult> {
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("tier,timezone").eq("id", userId).single();
  const perMonth = p ? TIERS[p.tier as Tier].compatPerMonth : 0;
  if (!perMonth) return { ok: false, error: "Synastry readings with Your People are part of Deep Dive.", status: 403 };
  const { data: person } = await db.from("people").select("id,name").eq("id", personId).eq("user_id", userId).maybeSingle();
  if (!person) return { ok: false, error: "We couldn't find that person.", status: 404 };
  const used = await planUsedThisMonth(userId, p!.timezone, "synastry");
  if (used >= perMonth) return { ok: true, needsExtra: true, personId: person.id };
  const { data: r } = await db.from("readings").insert({
    user_id: userId, kind: "synastry", person_id: person.id, title: `You & ${person.name}`, deliver_at: new Date().toISOString(),
  }).select("id").single();
  if (!r) return { ok: false, error: "Couldn't start the reading. Try again.", status: 500 };
  after(async () => { await generateReading(r.id); await deliverDue(); });
  return { ok: true, started: true };
}

/** Members get one Full Chart reading. Starts it if they don't have one yet. */
export async function ensureFullChart(userId: string, opts: { force?: boolean } = {}) {
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("tier,birth_date").eq("id", userId).maybeSingle();
  if (!p?.birth_date) return { ok: false as const, error: "Add your birth details first.", status: 400 };
  if (!opts.force && !TIERS[p.tier as Tier]?.fullChart) return { ok: false as const, error: "The Full Chart comes with a membership.", status: 403 };
  const { data: existing } = await db.from("readings").select("id").eq("user_id", userId).eq("kind", "fullchart").neq("status", "failed").limit(1);
  if (existing?.length) return { ok: true as const, started: false };
  const { data: r } = await db.from("readings").insert({
    user_id: userId, kind: "fullchart", title: "Your Full Chart", deliver_at: new Date().toISOString(),
  }).select("id").single();
  if (!r) return { ok: false as const, error: "Couldn't start it. Try again.", status: 500 };
  after(async () => { await generateReading(r.id); await deliverDue(); });
  return { ok: true as const, started: true };
}
