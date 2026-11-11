import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase";
export async function POST(req: Request) {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), { status: 303 });
}
