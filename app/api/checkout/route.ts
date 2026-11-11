import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { stripe, priceFor } from "@/lib/stripe";
import { Tier } from "@/lib/config";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { tier, interval } = await req.json().catch(() => ({}));
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 400 });
  const price = tier === "timeline" || tier === "deep" ? await priceFor(tier as Tier, interval === "year" ? "year" : "month") : undefined;
  if (!price) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("stripe_customer_id,stripe_subscription_id,tier").eq("id", user.id).single();
  const s = stripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL!;

  // Already subscribed: switch plans in the billing portal instead of a second subscription
  if (p?.stripe_subscription_id && p.tier !== "free") {
    const portal = await s.billingPortal.sessions.create({ customer: p.stripe_customer_id!, return_url: `${site}/dashboard` });
    return NextResponse.json({ url: portal.url });
  }
  let customer = p?.stripe_customer_id;
  if (!customer) {
    customer = (await s.customers.create({ email: user.email!, metadata: { user_id: user.id } })).id;
    await db.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }
  const session = await s.checkout.sessions.create({
    mode: "subscription", customer, line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id }, billing_mode: { type: "flexible" } },
    allow_promotion_codes: true,
    success_url: `${site}/dashboard?upgraded=1`, cancel_url: `${site}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
