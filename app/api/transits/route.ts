import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase";
import { ensureTransits } from "@/lib/compat";

export const maxDuration = 300; // the reading is written right after this responds

/** Members: start the Upcoming Transits reading that's included in the membership. */
export async function POST() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const r = await ensureTransits(user.id);
  return NextResponse.json(r.ok ? r : { error: r.error }, { status: r.ok ? 200 : r.status });
}
