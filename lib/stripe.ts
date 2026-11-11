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

/** Which plan a subscription price belongs to (by its lookup key) */
export function tierForPrice(price?: Stripe.Price | null): Tier | null {
  const key = price?.lookup_key;
  if (!key) return null;
  return (Object.keys(TIERS) as Tier[]).find(t => TIERS[t].stripeLookupKey === key || TIERS[t].stripeYearlyLookupKey === key) ?? null;
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

export async function priceIdForLookupKey(key: string) { return (await priceIds())[key]; }
