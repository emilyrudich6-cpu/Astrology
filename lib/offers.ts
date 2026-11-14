// What's for sale, in one place: the homepage list, the sign-up summary and the buy pages all read this.
import { ONE_TIME, TIERS } from "./config";
import { priceIdForLookupKey } from "./stripe";

export type OfferKey = "yearahead" | "synastry" | "deep";
export interface Offer { key: OfferKey; label: string; priceLine: string; blurb: string; path: string; lookupKey: string }

export const OFFERS: Offer[] = [
  { key: "yearahead", label: ONE_TIME.yearahead.label, priceLine: `${ONE_TIME.yearahead.price} once`, path: "/buy/yearahead",
    blurb: "Your next 12 months: every major transit peak date, grouped into themes.", lookupKey: ONE_TIME.yearahead.stripeLookupKey },
  { key: "synastry", label: ONE_TIME.synastry.label, priceLine: `${ONE_TIME.synastry.price} once`, path: "/buy/synastry",
    blurb: "Your chart next to theirs: attraction, communication, friction and the dates your timelines line up.", lookupKey: ONE_TIME.synastry.stripeLookupKey },
  { key: "deep", label: TIERS.deep.label, priceLine: TIERS.deep.price.replace(" / ", "/"), path: "/dashboard?plan=deep",
    blurb: "Monthly timeline updates, 2 personalized insights and 5 synastry readings a month. Cancel any time.", lookupKey: TIERS.deep.stripeLookupKey! },
];

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

/** Only offers with a live price in Stripe get a buy button (the webhook can fulfil all three) */
export async function availability(): Promise<Record<OfferKey, boolean>> {
  const out = { yearahead: false, synastry: false, deep: false } as Record<OfferKey, boolean>;
  if (!process.env.STRIPE_SECRET_KEY) return out;
  await Promise.all(OFFERS.map(async o => { try { out[o.key] = !!(await priceIdForLookupKey(o.lookupKey)); } catch { out[o.key] = false; } }));
  return out;
}
