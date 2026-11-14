import { NextResponse, type NextRequest } from "next/server";
import { FEATURES } from "@/lib/features";
import { REF_COOKIE } from "@/lib/referrals";

/** Invite links: remember who invited this visitor, then send them to the homepage */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL(FEATURES.referrals ? "/?invited=1" : "/", req.url));
  if (FEATURES.referrals && /^[A-Z2-9]{6,12}$/i.test(code))
    res.cookies.set(REF_COOKIE, code.toUpperCase(), { maxAge: 60 * 60 * 24 * 30, sameSite: "lax", path: "/" });
  return res;
}
