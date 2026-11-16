import { NextResponse, after } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { attachReferral, qualifyReferral } from "@/lib/referrals";
import { ensureCustomer } from "@/lib/stripe";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const parsed = parseBirth(body);
  const next = typeof body.next === "string" && body.next.startsWith("/") && !body.next.startsWith("//") ? body.next : "/dashboard";
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const db = supabaseAdmin();
  const { data: before } = await db.from("profiles").select("birth_date").eq("id", user.id).maybeSingle();
  const { error } = await db.from("profiles").upsert({ id: user.id, email: user.email, ...parsed.value });
  if (error) return NextResponse.json({ error: "Couldn't save your details. Try again." }, { status: 500 });

  // First time birth details are saved. (The written Natal Chart Deep Dive is a paid report now, so nothing is
  // written here; accounts that already have one keep it.)
  if (!before?.birth_date) {
    await attachReferral(user).catch(() => {}); // in case the email-confirm step didn't link it
    // If this account came from an invite, the inviter earns their free synastry reading
    await qualifyReferral(user).catch(() => {});
  }
  if (process.env.STRIPE_SECRET_KEY) after(() => ensureCustomer(user).then(() => {}, () => {}));
  return NextResponse.json({ ok: true, redirect: next });
}
