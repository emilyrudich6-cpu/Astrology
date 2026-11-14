import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { stripe, priceFor, ensureCustomer, isMissingCustomer } from "@/lib/stripe";
import { Tier } from "@/lib/config";

export async function POST(req: Request) {
  const [user, { tier, interval }] = await Promise.all([currentUser(), req.json().catch(() => ({}))]);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 400 });
  const db = supabaseAdmin();
  const [price, { data: p }] = await Promise.all([
    tier === "timeline" || tier === "deep" ? priceFor(tier as Tier, interval === "year" ? "year" : "month") : Promise.resolve(undefined),
    db.from("profiles").select("stripe_customer_id,stripe_subscription_id,tier").eq("id", user.id).single(),
  ]);
  if (!price) return NextResponse.json({ error: "Payments aren't set up yet." }, { status: 400 });
  const s = stripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL!;

  // Already subscribed: switch plans in the billing portal instead of a second subscription
  if (p?.stripe_subscription_id && p.tier !== "free") {
    const portal = await s.billingPortal.sessions.create({ customer: p.stripe_customer_id!, return_url: `${site}/dashboard` });
    return NextResponse.json({ url: portal.url });
  }
  const open = (customer: string) => s.checkout.sessions.create({
    mode: "subscription", customer, line_items: [{ price, quantity: 1 }],
    client_reference_id: user.id,
    subscription_data: { metadata: { user_id: user.id }, billing_mode: { type: "flexible" } },
    allow_promotion_codes: true,
    success_url: `${site}/dashboard?upgraded=1`, cancel_url: `${site}/dashboard`,
  });
  let session;
  try { session = await open(await ensureCustomer(user, p?.stripe_customer_id)); }
  catch (e) {
    if (!isMissingCustomer(e)) throw e;
    session = await open(await ensureCustomer(user, null, true)); // saved under the other mode (test vs live): start a new one
  }
  return NextResponse.json({ url: session.url });
}
