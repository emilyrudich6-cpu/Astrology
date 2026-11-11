import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { stripe, currentOffer } from "@/lib/stripe";
import { ONE_TIME, OneTimeKey, QUESTION_MENU } from "@/lib/config";
import { parseBirth } from "@/lib/validate";

const RELATIONSHIPS = ["partner", "crush", "ex", "friend", "family", "business partner", "coworker"];

/** Starts a one-time Stripe checkout. The Stripe webhook writes the reading once payment succeeds. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const product = body.product as OneTimeKey;
  const offer = ONE_TIME[product] ? await currentOffer(product) : null;
  const price = offer?.priceId;
  if (!price || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "This isn't available right now." }, { status: 400 });

  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("stripe_customer_id,birth_date").eq("id", user.id).single();
  if (!p?.birth_date) return NextResponse.json({ error: "Add your birth details first." }, { status: 400 });

  const metadata: Record<string, string> = { user_id: user.id, product };
  if (product === "question") {
    const cat = QUESTION_MENU.find(c => c.key === body.category);
    if (!cat || !cat.questions.includes(body.question)) return NextResponse.json({ error: "Pick a question from the menu." }, { status: 400 });
    metadata.category = cat.key; metadata.question = body.question;
  }
  if (product === "synastry") {
    const parsed = parseBirth(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const relationship = RELATIONSHIPS.includes(body.relationship) ? body.relationship : "partner";
    const { data: person } = await db.from("people").insert({ user_id: user.id, relationship, purchased: true, ...parsed.value }).select("id").single();
    if (!person) return NextResponse.json({ error: "Couldn't save their details. Try again." }, { status: 500 });
    metadata.person_id = person.id;
  }

  const s = stripe();
  let customer = p.stripe_customer_id;
  if (!customer) {
    customer = (await s.customers.create({ email: user.email!, metadata: { user_id: user.id } })).id;
    await db.from("profiles").update({ stripe_customer_id: customer }).eq("id", user.id);
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const session = await s.checkout.sessions.create({
    mode: "payment", customer, line_items: [{ price, quantity: 1 }], client_reference_id: user.id,
    metadata, allow_promotion_codes: true,
    success_url: `${site}/dashboard?bought=${product}`, cancel_url: `${site}/dashboard`,
  });
  return NextResponse.json({ url: session.url });
}
