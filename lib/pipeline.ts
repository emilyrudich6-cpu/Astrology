// Writes readings ahead of time and releases them on their surprise delivery moment.
import { supabaseAdmin } from "./supabase";
import { natalReading, monthlyTimeline, questionAnswer, yearAheadTimeline } from "./readings";
import { fullChartReading } from "./fullchart";
import { synastryDocReading } from "./synastry-doc";
import { BirthData } from "./engine/natal";
import { notifyReadingArrived, inviteToSubscribe } from "./notify";
import { firstTimelineTime, nextMonthlyTimelineTime } from "./schedule";
import { TIERS, Tier } from "./config";

const PREGENERATE_HOURS = 12;   // write readings this far ahead of delivery
const STUCK_MINUTES = 15;
const MAX_ATTEMPTS = 3;

export function birthFromRow(r: any): BirthData {
  return {
    name: r.name ?? "You", date: r.birth_date, time: r.birth_time || null,
    timezone: r.timezone, latitude: r.latitude, longitude: r.longitude, place: r.birth_place ?? undefined,
  };
}

/** Write one reading. Safe to call twice: only one caller can claim it. */
export async function generateReading(id: string) {
  const db = supabaseAdmin();
  const { data: row } = await db.from("readings").select("*").eq("id", id).single();
  if (!row || row.status !== "scheduled") return;
  const { data: claimed } = await db.from("readings")
    .update({ status: "generating", claimed_at: new Date().toISOString(), attempts: row.attempts + 1 })
    .eq("id", id).eq("status", "scheduled").select().maybeSingle();
  if (!claimed) return;

  try {
    const { data: profile } = await db.from("profiles").select("*").eq("id", row.user_id).single();
    if (!profile?.birth_date) throw new Error("Member has no birth data yet");
    if (row.kind === "timeline" && !row.paid && !TIERS[profile.tier as Tier].monthlyTimeline) {
      await db.from("readings").delete().eq("id", id); // subscription ended before it was due
      return;
    }
    const me = birthFromRow(profile);
    const deliverAt = new Date(row.deliver_at);
    const now = new Date();
    const asOf = deliverAt > now ? deliverAt : now; // timing is calculated from the day it arrives
    let out: { title: string; body: string };
    if (row.kind === "natal") out = await natalReading(me, asOf);
    else if (row.kind === "timeline") out = await monthlyTimeline(me, asOf);
    else if (row.kind === "question") out = await questionAnswer(me, row.category, row.question, asOf);
    else if (row.kind === "yearahead") out = await yearAheadTimeline(me, asOf);
    else if (row.kind === "fullchart") out = await fullChartReading(me, asOf);
    else {
      const { data: person } = await db.from("people").select("*").eq("id", row.person_id).single();
      if (!person) throw new Error("Saved person was removed");
      out = await synastryDocReading(me, birthFromRow(person), person.relationship, asOf);
    }
    await db.from("readings").update({ status: "ready", title: out.title, body: out.body, error: null }).eq("id", id);
  } catch (e: any) {
    const failed = row.attempts + 1 >= MAX_ATTEMPTS;
    await db.from("readings").update({ status: failed ? "failed" : "scheduled", error: String(e?.message ?? e).slice(0, 500) }).eq("id", id);
    console.error("reading failed", id, e);
  }
}

/** Release every finished reading whose moment has come */
export async function deliverDue() {
  const db = supabaseAdmin();
  const { data: due } = await db.from("readings").select("id,user_id,kind,title,deliver_at")
    .eq("status", "ready").is("delivered_at", null).lte("deliver_at", new Date().toISOString()).limit(200);
  let n = 0;
  for (const r of due ?? []) {
    const { data: ok } = await db.from("readings").update({ delivered_at: new Date().toISOString() })
      .eq("id", r.id).is("delivered_at", null).select("id").maybeSingle();
    if (!ok) continue;
    n++;
    const { data: p } = await db.from("profiles").select("email,timezone,tier").eq("id", r.user_id).single();
    await notifyReadingArrived(r.user_id, p?.email ?? null, r.id, r.title ?? "Your reading");
    if (r.kind === "timeline" && p && TIERS[p.tier as Tier].monthlyTimeline) {
      await db.from("readings").insert({ user_id: r.user_id, kind: "timeline", deliver_at: nextMonthlyTimelineTime(p.timezone, new Date(r.deliver_at)).toISOString() });
    }
  }
  return n;
}

/** Make sure every paying member has their next monthly timeline on the way */
export async function scheduleTimelines() {
  const db = supabaseAdmin();
  const paidTiers = (Object.keys(TIERS) as Tier[]).filter(t => TIERS[t].monthlyTimeline);
  const { data: members } = await db.from("profiles").select("id,timezone,birth_date").in("tier", paidTiers);
  let n = 0;
  for (const m of members ?? []) {
    if (!m.birth_date) continue;
    const { data: pending } = await db.from("readings").select("id").eq("user_id", m.id).eq("kind", "timeline")
      .is("delivered_at", null).neq("status", "failed").limit(1);
    if (pending?.length) continue;
    const { data: last } = await db.from("readings").select("deliver_at").eq("user_id", m.id).eq("kind", "timeline")
      .not("delivered_at", "is", null).order("deliver_at", { ascending: false }).limit(1);
    const lastAt = last?.[0] ? new Date(last[0].deliver_at) : null;
    const recent = lastAt && Date.now() - lastAt.getTime() < 20 * 86400000;
    const when = recent ? nextMonthlyTimelineTime(m.timezone, lastAt!) : firstTimelineTime(m.timezone);
    await db.from("readings").insert({ user_id: m.id, kind: "timeline", deliver_at: when.toISOString() });
    n++;
  }
  return n;
}

/** One pass of the delivery machine. Called by the scheduler every 15 minutes. */
export async function runCycle(timeBudgetMs = 240_000) {
  const started = Date.now();
  const db = supabaseAdmin();
  // Unstick readings whose writer crashed
  await db.from("readings").update({ status: "scheduled" }).eq("status", "generating")
    .lt("claimed_at", new Date(Date.now() - STUCK_MINUTES * 60000).toISOString());
  const scheduled = await scheduleTimelines();
  const horizon = new Date(Date.now() + PREGENERATE_HOURS * 3600000).toISOString();
  const { data: upcoming } = await db.from("readings").select("id").eq("status", "scheduled")
    .lte("deliver_at", horizon).order("deliver_at").limit(50);
  let written = 0;
  for (const r of upcoming ?? []) {
    if (Date.now() - started > timeBudgetMs) break;
    await generateReading(r.id);
    written++;
  }
  const delivered = await deliverDue();
  const invited = await sendBonusEndedInvites();
  return { scheduledTimelines: scheduled, written, delivered, invited };
}

/** When a free bonus month ends (and they haven't subscribed), invite them to keep their timeline */
export async function sendBonusEndedInvites() {
  const db = supabaseAdmin();
  const { data: due } = await db.from("profiles").select("id,email,name")
    .eq("tier", "free").eq("bonus_invite_sent", false).lte("bonus_timeline_until", new Date().toISOString()).limit(100);
  for (const p of due ?? []) {
    await inviteToSubscribe(p.id, p.email, p.name);
    await db.from("profiles").update({ bonus_invite_sent: true }).eq("id", p.id);
  }
  return due?.length ?? 0;
}
