import Stripe from "stripe";
import { TIERS, Tier } from "./config";
export const stripe = () => new Stripe(process.env.STRIPE_SECRET_KEY!);
export const priceFor = (t: Tier) => (TIERS[t].stripePriceEnv ? process.env[TIERS[t].stripePriceEnv!] : undefined);
export function tierForPrice(priceId?: string | null): Tier | null {
  return (Object.keys(TIERS) as Tier[]).find(t => priceFor(t) && priceFor(t) === priceId) ?? null;
}
