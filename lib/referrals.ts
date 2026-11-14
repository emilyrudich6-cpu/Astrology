// Phase 3: invite a friend, unlock a free synastry reading. Qualification and redemption are
// enforced in the database (supabase/006); this file only calls those functions and reads status.
import { cookies } from "next/headers";
import { supabaseAdmin } from "./supabase";
import { FEATURES } from "./features";

export const REF_COOKIE = "vp_ref";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vertexpoint.talk";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

export const inviteLink = (code: string) => `${SITE}/i/${code}`;

/** The member's invite code, created the first time it's needed */
export async function getInviteCode(userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("invite_code").eq("id", userId).maybeSingle();
  if (!p) return null;
  if (p.invite_code) return p.invite_code;
  for (let i = 0; i < 5; i++) {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes, b => ALPHABET[b % ALPHABET.length]).join("");
    const { data } = await db.from("profiles").update({ invite_code: code }).eq("id", userId).is("invite_code", null).select("invite_code").maybeSingle();
    if (data?.invite_code) return data.invite_code;
    const { data: again } = await db.from("profiles").select("invite_code").eq("id", userId).maybeSingle();
    if (again?.invite_code) return again.invite_code; // another request set it first
  }
  return null;
}

/** Links a newly signed-up account to the invite it came from (signup metadata first, then the cookie) */
export async function attachReferral(user: { id: string; user_metadata?: any }) {
  if (!FEATURES.referrals) return;
  let code: string | undefined = user.user_metadata?.ref;
  if (!code) { try { code = (await cookies()).get(REF_COOKIE)?.value; } catch { code = undefined; } }
  if (!code || !/^[A-Z2-9]{6,12}$/i.test(code)) return;
  await supabaseAdmin().rpc("attach_referral", { p_friend: user.id, p_code: code });
}

/** Called when a verified friend creates their first free birth chart */
export async function qualifyReferral(user: { id: string; email_confirmed_at?: string | null; user_metadata?: any }) {
  if (!FEATURES.referrals || !user.email_confirmed_at) return;
  await supabaseAdmin().rpc("qualify_referral", { p_friend: user.id });
}

export type InviteState =
  | { kind: "none" }
  | { kind: "pending"; friend: string }
  | { kind: "declined"; friend: string }
  | { kind: "waiting_share"; friend: string }
  | { kind: "ready"; friend: string }
  | { kind: "writing"; friend: string; readingId: string }
  | { kind: "failed"; friend: string; readingId: string }
  | { kind: "redeemed"; friend: string; readingId: string };

/** What the inviter should see on their invite card */
export async function inviteStatus(userId: string): Promise<InviteState> {
  const db = supabaseAdmin();
  const { data: refs } = await db.from("referrals").select("*").eq("inviter_id", userId).order("created_at", { ascending: false });
  if (!refs?.length) return { kind: "none" };
  const { data: friends } = await db.from("profiles").select("id,name").in("id", refs.map(r => r.friend_id));
  const nameOf = (id: string) => friends?.find(f => f.id === id)?.name || "Your friend";
  const won = refs.find(r => r.rewarded);
  if (won) {
    const friend = nameOf(won.friend_id);
    if (won.reading_id) {
      const { data: rd } = await db.from("readings").select("status,delivered_at").eq("id", won.reading_id).maybeSingle();
      if (rd?.status === "failed") return { kind: "failed", friend, readingId: won.reading_id };
      if (rd?.delivered_at) return { kind: "redeemed", friend, readingId: won.reading_id };
      return { kind: "writing", friend, readingId: won.reading_id };
    }
    return won.friend_shared ? { kind: "ready", friend } : { kind: "waiting_share", friend };
  }
  const declined = refs.find(r => r.friend_shared === false);
  if (declined && !refs.some(r => r.status === "signed_up")) return { kind: "declined", friend: nameOf(declined.friend_id) };
  return { kind: "pending", friend: nameOf(refs[0].friend_id) };
}

/** For the friend: an invite reward waiting on their permission to share their chart */
export async function sharePrompt(userId: string): Promise<{ inviter: string } | null> {
  if (!FEATURES.referrals) return null;
  const db = supabaseAdmin();
  const { data: r } = await db.from("referrals").select("inviter_id,friend_shared,rewarded,reading_id").eq("friend_id", userId).maybeSingle();
  if (!r || !r.rewarded || r.friend_shared !== null || r.reading_id) return null;
  const { data: inv } = await db.from("profiles").select("name").eq("id", r.inviter_id).maybeSingle();
  return { inviter: inv?.name || "Your friend" };
}
