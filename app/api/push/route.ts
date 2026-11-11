import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) return NextResponse.json({ error: "Bad subscription" }, { status: 400 });
  await supabaseAdmin().from("push_subscriptions").upsert({ user_id: user.id, endpoint: sub.endpoint, keys: sub.keys }, { onConflict: "endpoint" });
  return NextResponse.json({ ok: true });
}
