import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, tierForPrice } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

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
