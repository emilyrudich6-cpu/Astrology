import { NextResponse, after } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { generateReading, deliverDue } from "@/lib/pipeline";
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
  const { error } = await db.from("profiles").upsert({ id: user.id, email: user.email, ...parsed.value });
  if (error) return NextResponse.json({ error: "Couldn't save your details. Try again." }, { status: 500 });

  // One free natal chart per account
  const { data: existing } = await db.from("readings").select("id").eq("user_id", user.id).eq("kind", "natal").limit(1);
  if (!existing?.length) {
    await attachReferral(user).catch(() => {}); // before the chart exists, in case the email-confirm step didn't link it
    const { data: r } = await db.from("readings").insert({ user_id: user.id, kind: "natal", deliver_at: new Date().toISOString() }).select("id").single();
    if (r) after(async () => { await generateReading(r.id); await deliverDue(); });
    // First free chart: if this account came from an invite, the inviter earns their free synastry reading
    await qualifyReferral(user).catch(() => {});
  }
  if (process.env.STRIPE_SECRET_KEY) after(() => ensureCustomer(user).then(() => {}, () => {}));
  return NextResponse.json({ ok: true, redirect: next });
}
