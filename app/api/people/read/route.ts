import { NextResponse } from "next/server";
import { currentUser } from "@/lib/supabase";
import { startIncludedReading } from "@/lib/compat";

export const maxDuration = 300;

/** A new compatibility reading with someone already in Your People. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await req.json().catch(() => ({}));
  if (typeof id !== "string") return NextResponse.json({ error: "Choose a person." }, { status: 400 });
  const r = await startIncludedReading(user.id, id);
  return NextResponse.json(r.ok ? r : { error: r.error }, { status: r.ok ? 200 : r.status });
}
