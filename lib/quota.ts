import { supabaseAdmin } from "./supabase";
import { startOfMemberMonth } from "./schedule";
import { stripe } from "./stripe";

// Start of each member's current billing period, from Stripe, remembered for 10 minutes
const periods = new Map<string, { at: number; start: string }>();

/** When the member's current allowance began: the start of their Stripe billing period, so the count resets on the
 *  day they're billed. Falls back to the calendar month if Stripe can't be reached or there's no subscription. */
export async function allowanceStart(subscriptionId: string | null | undefined, timezone: string): Promise<string> {
  const fallback = startOfMemberMonth(timezone);
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) return fallback;
  const hit = periods.get(subscriptionId);
  if (hit && Date.now() - hit.at < 600_000 && process.env.NODE_ENV !== "development") return hit.start;
  try {
    const sub: any = await stripe().subscriptions.retrieve(subscriptionId);
    const secs = sub.current_period_start ?? sub.items?.data?.[0]?.current_period_start;
    if (!secs) return fallback;
    const start = new Date(secs * 1000).toISOString();
    periods.set(subscriptionId, { at: Date.now(), start });
    return start;
  } catch { return fallback; }
}

/** How many readings of a kind the member's plan has used since their allowance began (paid one-offs don't count) */
export async function planUsedThisMonth(userId: string, timezone: string, kind: "question" | "synastry", subscriptionId?: string | null): Promise<number> {
  const { count } = await supabaseAdmin().from("readings").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("kind", kind).eq("paid", false).gte("created_at", await allowanceStart(subscriptionId, timezone));
  return count ?? 0;
}
