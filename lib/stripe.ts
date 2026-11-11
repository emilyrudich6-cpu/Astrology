import Stripe from "stripe";
import { TIERS, Tier, Interval, ONE_TIME, OneTimeKey } from "./config";
export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);
export const priceFor = (t: Tier, interval: Interval = "month") => {
  const env = interval === "year" ? TIERS[t].stripeYearlyPriceEnv : TIERS[t].stripePriceEnv;
  return env ? process.env[env] : undefined;
};
export function tierForPrice(priceId?: string | null): Tier | null {
  if (!priceId) return null;
  return (Object.keys(TIERS) as Tier[]).find(t => priceFor(t, "month") === priceId || priceFor(t, "year") === priceId) ?? null;
}
import { supabaseAdmin } from "./supabase";

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
    const foundingPriceId = process.env[item.founding.stripePriceEnv];
    if (left > 0 && foundingPriceId) return { priceId: foundingPriceId, price: item.founding.price, regular: item.price, foundingLeft: left };
  }
  return { priceId: process.env[item.stripePriceEnv], price: item.price, regular: item.price, foundingLeft: 0 };
}
