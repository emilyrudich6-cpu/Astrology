// What's for sale, in one place: the homepage list, the sign-up summary and the buy pages all read this.
import { ONE_TIME, TIERS } from "./config";
import { priceMatches } from "./stripe";

export type OfferKey = "synastry" | "deepdive" | "yearahead" | "deep";
export interface Offer { key: OfferKey; label: string; price: string; priceLine: string; cta: string; blurb: string; path: string; lookupKey: string; interval: "month" | null }

const once = (k: "synastry" | "deepdive" | "yearahead", path: string, blurb: string): Offer =>
  ({ key: k, label: ONE_TIME[k].label, price: ONE_TIME[k].price, priceLine: ONE_TIME[k].price, cta: ONE_TIME[k].cta!, blurb, path, lookupKey: ONE_TIME[k].stripeLookupKey, interval: null });

/** The one-time readings, in the order they're shown, then the subscription */
export const OFFERS: Offer[] = [
  once("synastry", "/buy/synastry", "Your chart next to theirs: attraction, communication, friction and the dates your timelines line up."),
  once("deepdive", "/buy/deepdive", "Your long personal report: the angles, every planet and house, the aspects, and a timeline of exact dates."),
  once("yearahead", "/buy/yearahead", "Your next 12 months: every major transit peak date, grouped into themes."),
  { key: "deep", label: TIERS.deep.label, price: TIERS.deep.price, priceLine: TIERS.deep.price.replace(" / ", "/"), cta: "Join monthly", path: "/dashboard?plan=deep",
    blurb: TIERS.deep.blurb, lookupKey: TIERS.deep.stripeLookupKey!, interval: "month" },
];
export const ONE_TIME_OFFERS = OFFERS.filter(o => o.interval === null);
export const MONTHLY = OFFERS.find(o => o.key === "deep")!;

export const offer = (k: OfferKey) => OFFERS.find(o => o.key === k)!;

/** The offer a sign-in or sign-up is on its way to, from the "next" address */
export function offerForNext(next: string | null | undefined): Offer | null {
  if (!next) return null;
  let path = next.split("#")[0];
  // "/onboarding?next=/buy/synastry" is still on the way to that reading
  const inner = path.startsWith("/onboarding") ? new URLSearchParams(path.split("?")[1] ?? "").get("next") : null;
  if (inner) path = inner;
  return OFFERS.find(o => path === o.path || path.startsWith(o.path + "?") || (o.key === "deep" && /[?&]plan=deep\b/.test(path))) ?? null;
}

/** An offer gets a buy button only when Stripe has its price and that price is the amount and billing
 *  interval shown on the site (the webhook and the return page can fulfil all of them). */
export async function availability(): Promise<Record<OfferKey, boolean>> {
  const out = { synastry: false, deepdive: false, yearahead: false, deep: false } as Record<OfferKey, boolean>;
  if (!process.env.STRIPE_SECRET_KEY) return out;
  await Promise.all(OFFERS.map(async o => { try { out[o.key] = await priceMatches(o.lookupKey, o.price, o.interval); } catch { out[o.key] = false; } }));
  return out;
}
