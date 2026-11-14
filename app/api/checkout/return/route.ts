import { NextResponse, after, type NextRequest } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { confirmCheckout } from "@/lib/fulfil";
import { writeNow } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // the reading is written right after this responds

/** Where Stripe Checkout sends a buyer back. Confirms the payment with Stripe straight away and starts the
 *  reading, so nothing waits on the webhook, then shows Your readings. Reloading it is harmless. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const product = (url.searchParams.get("product") ?? "").replace(/[^a-z]/g, "");
  const sessionId = url.searchParams.get("session_id");
  const user = await currentUser();
  if (!user) return NextResponse.redirect(new URL(`/login?mode=signin&next=${encodeURIComponent(url.pathname + url.search)}`, url.origin));
  try {
    const { data: p } = await supabaseAdmin().from("profiles").select("stripe_customer_id").eq("id", user.id).maybeSingle();
    const { toWrite } = await confirmCheckout(user.id, p?.stripe_customer_id ?? null, sessionId);
    if (toWrite.length) after(() => writeNow(toWrite));
  } catch (e) {
    console.error("checkout return", (e as { code?: string })?.code ?? (e as Error)?.name); // the webhook still covers it
  }
  const to = new URL("/dashboard", url.origin);
  if (product) to.searchParams.set("bought", product);
  if (sessionId && /^cs_[A-Za-z0-9_]+$/.test(sessionId)) to.searchParams.set("session_id", sessionId);
  return NextResponse.redirect(to, 303);
}
