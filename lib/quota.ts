import { supabaseAdmin } from "./supabase";
import { startOfMemberMonth } from "./schedule";

/** How many readings of a kind the member's plan has used this calendar month (one-time purchases don't count) */
export async function planUsedThisMonth(userId: string, timezone: string, kind: "question" | "synastry"): Promise<number> {
  const db = supabaseAdmin();
  const { data: paid } = await db.from("purchases").select("reading_id").eq("user_id", userId).not("reading_id", "is", null);
  const paidIds = new Set((paid ?? []).map(r => r.reading_id as string));
  const { data } = await db.from("readings").select("id").eq("user_id", userId).eq("kind", kind)
    .gte("created_at", startOfMemberMonth(timezone));
  return (data ?? []).filter(r => !paidIds.has(r.id)).length;
}
