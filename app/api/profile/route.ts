import { NextResponse, after } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { parseBirth } from "@/lib/validate";
import { generateReading, deliverDue } from "@/lib/pipeline";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const parsed = parseBirth(await req.json());
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const db = supabaseAdmin();
  const { error } = await db.from("profiles").upsert({ id: user.id, email: user.email, ...parsed.value });
  if (error) return NextResponse.json({ error: "Couldn't save your details. Try again." }, { status: 500 });

  // One free natal chart per account
  const { data: existing } = await db.from("readings").select("id").eq("user_id", user.id).eq("kind", "natal").limit(1);
  if (!existing?.length) {
    const { data: r } = await db.from("readings").insert({ user_id: user.id, kind: "natal", deliver_at: new Date().toISOString() }).select("id").single();
    if (r) after(async () => { await generateReading(r.id); await deliverDue(); });
  }
  return NextResponse.json({ ok: true, redirect: "/dashboard" });
}
