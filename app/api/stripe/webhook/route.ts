import { NextResponse, after } from "next/server";
import Stripe from "stripe";
import { stripe, tierForPrice } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { ONE_TIME, OneTimeKey } from "@/lib/config";
import { generateReading, deliverDue } from "@/lib/pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

// Keeps each member's plan in sync with Stripe.
export async function POST(req: Request) {
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature")!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const sync = async (sub: Stripe.Subscription) => {
    const active = ["active", "trialing", "past_due"].includes(sub.status);
    const tier = active ? tierForPrice(sub.items.data[0]?.price) ?? "free" : "free";
    const userId = sub.metadata?.user_id;
    const q = db.from("profiles").update({ tier, subscription_status: sub.status, stripe_subscription_id: sub.id, stripe_customer_id: String(sub.customer) });
    await (userId ? q.eq("id", userId) : q.eq("stripe_customer_id", String(sub.customer)));
  };
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await sync(await stripe().subscriptions.retrieve(String(s.subscription)));
      if (s.mode === "payment" && s.payment_status === "paid") await fulfilOneTime(s);
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await sync(event.data.object as Stripe.Subscription);
      break;
  }
  return NextResponse.json({ received: true });
}

/** Writes the reading a one-time purchase paid for, right away. Safe if Stripe sends the event twice. */
async function fulfilOneTime(s: Stripe.Checkout.Session) {
  const db = supabaseAdmin();
  const m = s.metadata ?? {};
  if (!m.user_id || !m.product) return;
  const { error: dup } = await db.from("purchases").insert({ user_id: m.user_id, product: m.product, stripe_session_id: s.id, amount_cents: s.amount_total });
  if (dup) return; // already fulfilled (unique session id)
  const now = new Date().toISOString();
  const base = { user_id: m.user_id, deliver_at: now, paid: true };
  const row =
    m.product === "question" ? { ...base, kind: "question", category: m.category, question: m.question, title: m.question }
    : m.product === "synastry" ? { ...base, kind: "synastry", person_id: m.person_id, title: "The Two of You" }
    : m.product === "yearahead" ? { ...base, kind: "yearahead", title: "Your year ahead" }
    : null;
  if (!row) return;
  const ids: string[] = [];
  const { data: r } = await db.from("readings").insert(row).select("id").single();
  if (r) { ids.push(r.id); await db.from("purchases").update({ reading_id: r.id }).eq("stripe_session_id", s.id); }

  // Bonus: a free month of the personal timeline (no card charged later; they're invited to subscribe when it ends)
  const bonusDays = ONE_TIME[m.product as OneTimeKey]?.bonusTimelineDays;
  if (bonusDays) {
    const { data: p } = await db.from("profiles").select("tier,bonus_timeline_until").eq("id", m.user_id).single();
    const alreadyHadBonus = !!p?.bonus_timeline_until;
    if (p?.tier === "free" && !alreadyHadBonus) {
      await db.from("profiles").update({ bonus_timeline_until: new Date(Date.now() + bonusDays * 86400000).toISOString() }).eq("id", m.user_id);
      const { data: t } = await db.from("readings").insert({ ...base, kind: "timeline", title: "Your free month: personal timeline" }).select("id").single();
      if (t) ids.push(t.id);
    }
  }
  after(async () => { for (const id of ids) await generateReading(id); await deliverDue(); });
}
