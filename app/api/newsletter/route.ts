import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
export const runtime = "nodejs";

/** "Notes from Vertex Point" opt-in. Kept apart from "Email me my chart". */
export async function POST(req: Request) {
  const { email, source } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email.trim()))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
    return NextResponse.json({ error: "Sign-ups open once the site is fully set up." }, { status: 503 });
  const { error } = await supabaseAdmin().from("newsletter_signups")
    .upsert({ email: email.trim().toLowerCase(), source: typeof source === "string" ? source.slice(0, 30) : null, unsubscribed_at: null });
  if (error) { console.error("newsletter", error); return NextResponse.json({ error: "That didn't go through. Try again." }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}
