import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { stripe, currentOffer, priceIdForLookupKey, ensureCustomer, isMissingCustomer } from "@/lib/stripe";
import { ONE_TIME, OneTimeKey, QUESTION_MENU } from "@/lib/config";
import { parseBirth } from "@/lib/validate";

const RELATIONSHIPS = ["partner", "crush", "ex", "friend", "family", "business partner", "coworker"];

/** Starts a one-time Stripe checkout. The Stripe webhook writes the reading once payment succeeds. */
export async function POST(req: Request) {
  // Everything before checkout runs side by side, so the button opens Stripe as fast as possible
  const [user, body] = await Promise.all([currentUser(), req.json().catch(() => ({}))]);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const product = body.product as OneTimeKey;
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "This isn't available right now." }, { status: 400 });
  const db = supabaseAdmin();
  const [price, { data: p }] = await Promise.all([
    ONE_TIME[product]?.enabled ? currentOffer(product).then(o => (o ? priceIdForLookupKey(o.lookupKey) : undefined)) : Promise.resolve(undefined),
    db.from("profiles").select("stripe_customer_id,birth_date,tier").eq("id", user.id).single(),
  ]);
  if (!price) return NextResponse.json({ error: "This isn't available right now." }, { status: 400 });
  if (!p?.birth_date) return NextResponse.json({ error: "Add your birth details first." }, { status: 400 });
  if (ONE_TIME[product].membersOnly && p.tier !== "deep") return NextResponse.json({ error: "Extra readings are for Deep Dive members." }, { status: 403 });

  const metadata: Record<string, string> = { user_id: user.id, product };
  if (product === "question") {
    const cat = QUESTION_MENU.find(c => c.key === body.category);
    if (!cat || !cat.questions.includes(body.question)) return NextResponse.json({ error: "Pick a question from the menu." }, { status: 400 });
    metadata.category = cat.key; metadata.question = body.question;
  }
  // Usually made at sign-up already; if not, it's created while their details save
  const customerP = ensureCustomer(user, p.stripe_customer_id);
  customerP.catch(() => {}); // if we return early with an error below, a failure here isn't left unhandled
  if (product === "synastry") {
    const parsed = parseBirth(body);
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const relationship = RELATIONSHIPS.includes(body.relationship) ? body.relationship : "partner";
    const { data: person } = await db.from("people").insert({ user_id: user.id, relationship, purchased: true, ...parsed.value }).select("id").single();
    if (!person) return NextResponse.json({ error: "Couldn't save their details. Try again." }, { status: 500 });
    metadata.person_id = person.id;
  }

  if (product === "extra") {
    const { data: person } = await db.from("people").select("id").eq("id", body.person_id).eq("user_id", user.id).maybeSingle();
    if (!person) return NextResponse.json({ error: "Choose someone from Your People." }, { status: 400 });
    metadata.person_id = person.id;
  }

  const s = stripe();
  const site = process.env.NEXT_PUBLIC_SITE_URL!;
  const open = (customer: string) => s.checkout.sessions.create({
    mode: "payment", customer, line_items: [{ price, quantity: 1 }], client_reference_id: user.id,
    metadata, allow_promotion_codes: true,
    success_url: `${site}/dashboard?bought=${product}`,
    cancel_url: product === "synastry" || product === "yearahead" ? `${site}/buy/${product}?canceled=1` : `${site}/dashboard`,
  });
  let session;
  try { session = await open(await customerP); }
  catch (e) {
    if (!isMissingCustomer(e)) throw e;
    session = await open(await ensureCustomer(user, null, true)); // saved under the other mode (test vs live): start a new one
  }
  return NextResponse.json({ url: session.url });
}
