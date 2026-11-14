import { NextResponse, after } from "next/server";
import Stripe from "stripe";
import { stripe, tierForPrice } from "@/lib/stripe";
import { ensureFullChart } from "@/lib/compat";
import { supabaseAdmin } from "@/lib/supabase";
import { fulfilOneTime } from "@/lib/fulfil";
import { writeNow } from "@/lib/pipeline";

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
    // New members get their Full Chart right away
    if (tier !== "free") {
      const { data: prof } = userId ? { data: { id: userId } }
        : await db.from("profiles").select("id").eq("stripe_customer_id", String(sub.customer)).maybeSingle();
      if (prof?.id) await ensureFullChart(prof.id);
    }
  };
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      if (s.subscription) await sync(await stripe().subscriptions.retrieve(String(s.subscription)));
      if (s.mode === "payment" && s.payment_status === "paid") {
        // Safe if Stripe sends the event twice, or the buyer's return to the site got there first
        const { toWrite } = await fulfilOneTime(s);
        if (toWrite.length) after(() => writeNow(toWrite));
      }
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
