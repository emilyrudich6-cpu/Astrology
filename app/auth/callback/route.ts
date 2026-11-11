import { NextResponse, type NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as any;
  const nextParam = url.searchParams.get("next") ?? "/dashboard";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/dashboard";
  const sb = await supabaseServer();
  const { error } = code ? await sb.auth.exchangeCodeForSession(code)
    : tokenHash ? await sb.auth.verifyOtp({ token_hash: tokenHash, type: type ?? "email" })
    : { error: new Error("missing code") };
  return NextResponse.redirect(new URL(error ? "/login?next=" + encodeURIComponent(next) : next, url.origin));
}
