import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { cleanEntry, ENTRY_FIELDS } from "@/lib/journal";

/** Edit your own entry. Editing never counts against the cap. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const parsed = cleanEntry(await req.json().catch(() => ({})));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data: entry, error } = await supabaseAdmin().from("journal_entries")
    .update({ ...parsed.value, updated_at: new Date().toISOString() })
    .eq("id", id).eq("user_id", user.id).select(ENTRY_FIELDS).maybeSingle();
  if (error) { console.error("journal edit failed", error.code); return NextResponse.json({ error: "Couldn't save. Try again." }, { status: 500 }); }
  if (!entry) return NextResponse.json({ error: "We couldn't find that entry." }, { status: 404 });
  return NextResponse.json({ entry });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await params;
  const { data, error } = await supabaseAdmin().from("journal_entries").delete().eq("id", id).eq("user_id", user.id).select("id");
  if (error) { console.error("journal delete failed", error.code); return NextResponse.json({ error: "Couldn't delete. Try again." }, { status: 500 }); }
  if (!data?.length) return NextResponse.json({ error: "We couldn't find that entry." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
