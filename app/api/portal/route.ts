import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { data: p } = await supabaseAdmin().from("profiles").select("stripe_customer_id").eq("id", user.id).single();
  if (!p?.stripe_customer_id) return NextResponse.json({ error: "No billing account yet." }, { status: 400 });
  const portal = await stripe().billingPortal.sessions.create({ customer: p.stripe_customer_id, return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard` });
  return NextResponse.json({ url: portal.url });
}
