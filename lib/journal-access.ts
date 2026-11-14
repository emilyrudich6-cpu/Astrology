// Who can open the Phase 2 pages: signed in, feature on, Deep Dive member.
import { currentUser, supabaseAdmin } from "./supabase";
import { FEATURES, hasDeepDive } from "./features";

export async function journalCompareAccess() {
  if (!FEATURES.journalCompare) return { state: "off" as const };
  const user = await currentUser();
  if (!user) return { state: "signin" as const };
  const { data: profile } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return { state: "signin" as const };
  if (!hasDeepDive(profile.tier)) return { state: "upgrade" as const, user, profile };
  return { state: "ok" as const, user, profile };
}
