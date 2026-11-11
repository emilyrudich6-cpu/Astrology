import { supabaseAdmin } from "./supabase";
import { startOfMemberMonth } from "./schedule";

/** How many readings of a kind the member's plan has used this calendar month (paid one-offs don't count) */
export async function planUsedThisMonth(userId: string, timezone: string, kind: "question" | "synastry"): Promise<number> {
  const { count } = await supabaseAdmin().from("readings").select("id", { count: "exact", head: true })
    .eq("user_id", userId).eq("kind", kind).eq("paid", false).gte("created_at", startOfMemberMonth(timezone));
  return count ?? 0;
}
