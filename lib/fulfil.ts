// Turns a paid Stripe Checkout session into the reading it paid for. Used by the Stripe webhook and by the
// page people land on after paying, so a late or failed webhook can't leave a purchase without its reading.
import type Stripe from "stripe";
import { stripe } from "./stripe";
import { supabaseAdmin } from "./supabase";
import { ONE_TIME, OneTimeKey } from "./config";

export interface Fulfilled { readingId: string | null; toWrite: string[] }

/** Records the purchase and creates its reading. Safe to call any number of times for the same session:
 *  the purchase row is unique per session, so only the first call creates anything.
 *  Returns the purchase's reading and the readings the caller should now start writing. */
export async function fulfilOneTime(s: Stripe.Checkout.Session): Promise<Fulfilled> {
  const db = supabaseAdmin();
  const m = s.metadata ?? {};
  if (!m.user_id || !m.product || s.mode !== "payment" || s.payment_status !== "paid") return { readingId: null, toWrite: [] };
  const { error: dup } = await db.from("purchases").insert({ user_id: m.user_id, product: m.product, stripe_session_id: s.id, amount_cents: s.amount_total });
  if (dup) {
    const { data: p } = await db.from("purchases").select("reading_id").eq("stripe_session_id", s.id).maybeSingle();
    if (!p || p.reading_id) return { readingId: p?.reading_id ?? null, toWrite: [] }; // already fulfilled
    // Recorded earlier but its reading was never created: carry on and create it now
  }
  const now = new Date().toISOString();
  const base = { user_id: m.user_id, deliver_at: now, paid: true };
  const row =
    m.product === "question" ? { ...base, kind: "question", category: m.category, question: m.question, title: m.question }
    : m.product === "synastry" ? { ...base, kind: "synastry", person_id: m.person_id, title: "Your synastry reading" }
    : m.product === "extra" ? { ...base, kind: "synastry", person_id: m.person_id, title: "You & " + ((await db.from("people").select("name").eq("id", m.person_id).maybeSingle()).data?.name ?? "them") }
    : m.product === "yearahead" ? { ...base, kind: "yearahead", title: "Your year ahead" }
    : m.product === "deepdive" ? { ...base, kind: "natal", title: "Your Natal Chart Deep Dive" }
    : null;
  // A pre-order (audio) is recorded as a purchase; there is nothing to write
  if (!row) return { readingId: null, toWrite: [] };
  const { data: r } = await db.from("readings").insert(row).select("id").single();
  if (!r) return { readingId: null, toWrite: [] };
  // Only the caller that links the reading to the purchase keeps it (two callers can't both get here with a reading)
  const { data: linked } = await db.from("purchases").update({ reading_id: r.id }).eq("stripe_session_id", s.id).is("reading_id", null).select("id").maybeSingle();
  if (!linked) {
    await db.from("readings").delete().eq("id", r.id);
    const { data: p } = await db.from("purchases").select("reading_id").eq("stripe_session_id", s.id).maybeSingle();
    return { readingId: p?.reading_id ?? null, toWrite: [] };
  }
  const toWrite = [r.id];

  // Bonus: a free month of the personal timeline (no card charged later; they're invited to subscribe when it ends)
  const bonusDays = ONE_TIME[m.product as OneTimeKey]?.bonusTimelineDays;
  if (bonusDays && !dup) {
    const { data: p } = await db.from("profiles").select("tier,bonus_timeline_until").eq("id", m.user_id).single();
    if (p?.tier === "free" && !p.bonus_timeline_until) {
      await db.from("profiles").update({ bonus_timeline_until: new Date(Date.now() + bonusDays * 86400000).toISOString() }).eq("id", m.user_id);
      const { data: t } = await db.from("readings").insert({ ...base, kind: "timeline", title: "Your free month: personal timeline" }).select("id").single();
      if (t) toWrite.push(t.id);
    }
  }
  return { readingId: r.id, toWrite };
}

/** Back from Stripe Checkout: check the payment with Stripe directly and fulfil it, without waiting for the webhook.
 *  With a session id it checks that one session; without, the member's last few (catches purchases a webhook missed). */
export async function confirmCheckout(userId: string, customerId: string | null, sessionId?: string | null): Promise<Fulfilled> {
  const out: Fulfilled = { readingId: null, toWrite: [] };
  if (!process.env.STRIPE_SECRET_KEY) return out;
  let sessions: Stripe.Checkout.Session[] = [];
  if (sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) sessions = [await stripe().checkout.sessions.retrieve(sessionId)];
  else if (customerId) sessions = (await stripe().checkout.sessions.list({ customer: customerId, status: "complete", limit: 10 })).data;
  for (const s of sessions) {
    if (s.metadata?.user_id !== userId) continue; // only ever the signed-in member's own purchase
    const f = await fulfilOneTime(s);
    if (sessionId || f.toWrite.length) out.readingId = f.readingId ?? out.readingId;
    out.toWrite.push(...f.toWrite);
  }
  return out;
}
