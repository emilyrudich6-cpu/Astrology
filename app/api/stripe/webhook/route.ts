import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, tierForPrice } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { surpriseDeliveryTime } from "@/lib/schedule";

export const runtime = "nodejs";

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
    const tier = active ? tierForPrice(sub.items.data[0]?.price.id) ?? "free" : "free";
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

/** Schedules the reading a one-time purchase paid for. Safe if Stripe sends the event twice. */
async function fulfilOneTime(s: Stripe.Checkout.Session) {
  const db = supabaseAdmin();
  const m = s.metadata ?? {};
  if (!m.user_id || !m.product) return;
  const { error: dup } = await db.from("purchases").insert({ user_id: m.user_id, product: m.product, stripe_session_id: s.id, amount_cents: s.amount_total });
  if (dup) return; // already fulfilled (unique session id)
  const { data: profile } = await db.from("profiles").select("timezone").eq("id", m.user_id).single();
  const tz = profile?.timezone ?? "UTC";
  const base = { user_id: m.user_id, deliver_at: surpriseDeliveryTime(tz).toISOString() };
  const row =
    m.product === "question" ? { ...base, kind: "question", category: m.category, question: m.question, title: m.question }
    : m.product === "synastry" ? { ...base, kind: "synastry", person_id: m.person_id, title: "Compatibility reading" }
    : m.product === "yearahead" ? { ...base, kind: "yearahead", title: "Your year ahead", deliver_at: surpriseDeliveryTime(tz, new Date(), { min: 1, max: 3 }).toISOString() }
    : null;
  if (!row) return;
  const { data: r } = await db.from("readings").insert(row).select("id").single();
  if (r) await db.from("purchases").update({ reading_id: r.id }).eq("stripe_session_id", s.id);
}
