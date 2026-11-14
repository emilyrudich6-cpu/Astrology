import Stripe from "stripe";
import { TIERS, Tier, Interval, ONE_TIME, OneTimeKey } from "./config";
import { supabaseAdmin } from "./supabase";

export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs are looked up from Stripe by lookup key and cached for 10 minutes.
let cache: { at: number; ids: Record<string, string> } | null = null;
async function priceIds(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < 600_000) return cache.ids;
  const keys = [
    ...Object.values(TIERS).flatMap(t => [t.stripeLookupKey, t.stripeYearlyLookupKey]),
    ...Object.values(ONE_TIME).flatMap(o => [o.stripeLookupKey, o.founding?.stripeLookupKey]),
  ].filter(Boolean) as string[];
  const res = await stripe().prices.list({ lookup_keys: keys, active: true, limit: 100 });
  const ids = Object.fromEntries(res.data.map(p => [p.lookup_key!, p.id]));
  cache = { at: Date.now(), ids };
  return ids;
}

export async function priceFor(t: Tier, interval: Interval = "month"): Promise<string | undefined> {
  const key = interval === "year" ? TIERS[t].stripeYearlyLookupKey : TIERS[t].stripeLookupKey;
  return key ? (await priceIds())[key] : undefined;
}

/** Which plan a subscription price belongs to: by lookup key, or by the price's "tier" metadata.
 *  The metadata keeps members on older prices (whose lookup key moved to a new price) on their plan. */
export function tierForPrice(price?: Stripe.Price | null): Tier | null {
  const key = price?.lookup_key;
  const byKey = key ? (Object.keys(TIERS) as Tier[]).find(t => TIERS[t].stripeLookupKey === key || TIERS[t].stripeYearlyLookupKey === key) : undefined;
  if (byKey) return byKey;
  const meta = price?.metadata?.tier as Tier | undefined;
  return meta && meta !== "free" && meta in TIERS ? meta : null;
}

/** How many of a one-time product have sold (for the founding-price counter) */
export async function soldCount(k: OneTimeKey): Promise<number> {
  const { count } = await supabaseAdmin().from("purchases").select("id", { count: "exact", head: true }).eq("product", k);
  return count ?? 0;
}

/** The price to charge right now, and what to show: founding price until its limit is reached */
export async function currentOffer(k: OneTimeKey) {
  const item = ONE_TIME[k];
  if (!item?.enabled) return null;
  if (item.founding) {
    const sold = await soldCount(k).catch(() => 0);
    const left = item.founding.limit - sold;
    if (left > 0) return { lookupKey: item.founding.stripeLookupKey, price: item.founding.price, regular: item.price, foundingLeft: left };
  }
  return { lookupKey: item.stripeLookupKey, price: item.price, regular: item.price, foundingLeft: 0 };
}

/** The account's Stripe customer, created once. The idempotency key stops two at once (sign-up and a quick checkout) making duplicates. */
export async function ensureCustomer(user: { id: string; email?: string | null }, existing?: string | null, fresh = false): Promise<string> {
  const db = supabaseAdmin();
  if (!fresh) {
    if (existing) return existing;
    const { data } = await db.from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    if (data?.stripe_customer_id) return data.stripe_customer_id;
  }
  const c = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } },
    { idempotencyKey: `customer-${fresh ? "fresh-" : ""}${user.id}` });
  await db.from("profiles").update({ stripe_customer_id: c.id }).eq("id", user.id);
  return c.id;
}

/** A customer saved while the site used test keys doesn't exist in live mode (and the reverse) */
export function isMissingCustomer(e: unknown) {
  const err = e as { code?: string; param?: string; message?: string };
  return err?.code === "resource_missing" && (err.param === "customer" || /customer/i.test(err.message ?? ""));
}

export async function priceIdForLookupKey(key: string) { return (await priceIds())[key]; }
