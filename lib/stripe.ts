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
export const oneTimePrice = (k: OneTimeKey) => (ONE_TIME[k]?.enabled ? process.env[ONE_TIME[k].stripePriceEnv] : undefined);
