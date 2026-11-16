import { NextResponse } from "next/server";
import { currentUser, isAdmin } from "@/lib/supabase";
import { ensureFullChart } from "@/lib/compat";

export const maxDuration = 300; // the reading is written right after this responds

/** Admin test: write the Natal Chart Deep Dive without a payment (customers get it by buying it). */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const r = await ensureFullChart(user.id, { force: isAdmin(user.email) }); // admins can test it on any plan
  return NextResponse.json(r.ok ? r : { error: r.error }, { status: r.ok ? 200 : r.status });
}
