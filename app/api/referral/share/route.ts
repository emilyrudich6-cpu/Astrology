import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { FEATURES } from "@/lib/features";

/** The invited friend's answer: share their chart with the person who invited them, or not */
export async function POST(req: Request) {
  if (!FEATURES.referrals) return NextResponse.json({ error: "Not available." }, { status: 404 });
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { share } = await req.json().catch(() => ({}));
  if (typeof share !== "boolean") return NextResponse.json({ error: "Choose yes or no." }, { status: 400 });
  const { data, error } = await supabaseAdmin().rpc("set_referral_share", { p_friend: user.id, p_share: share });
  if (error) return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 });
  return NextResponse.json({ ok: true, result: data });
}
