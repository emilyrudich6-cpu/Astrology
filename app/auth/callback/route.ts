import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";
import { attachReferral } from "@/lib/referrals";

const safe = (n: string | null | undefined) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null);

/** Where email links land (sign-up confirmation, password reset).
 *  The link only signs someone in when it's opened in the same browser where they signed up; Gmail on
 *  iPhone opens links in its own browser, which can't finish that step. Supabase has still confirmed
 *  the email by then, so we say so and ask them to sign in, keeping where they were headed. */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const go = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as any;
  const errCode = url.searchParams.get("error_code") ?? url.searchParams.get("error");
  let next = safe(url.searchParams.get("next"));
  const login = (link: string) => go(`/login?mode=signin&link=${link}${next ? `&next=${encodeURIComponent(next)}` : ""}`);

  if (errCode) return login(/expired/i.test(errCode + (url.searchParams.get("error_description") ?? "")) ? "expired" : "invalid");

  const sb = await supabaseServer();
  const { error } = code ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash ? await sb.auth.verifyOtp({ token_hash: tokenHash, type: type ?? "email" })
    : { error: new Error("missing code") };
  const { data: { user } } = await sb.auth.getUser();
  // A password-reset link only works in the browser that asked for it
  if (error && next === "/reset-password") return go("/login?mode=forgot&link=reset");
  if (error && !user) return login(code || tokenHash ? "confirmed" : "invalid");
  if (error && user) return login("confirmed"); // signed in here as someone, but this link was for a sign-up started elsewhere

  if (user) {
    await attachReferral(user).catch(() => {});
    // The reading they started before signing up, remembered on the account
    const pending = safe(user.user_metadata?.pending_next);
    if (!next && pending) next = pending;
    if (pending) await sb.auth.updateUser({ data: { pending_next: null } }).catch(() => {});
  }
  return go(next ?? "/dashboard");
}
