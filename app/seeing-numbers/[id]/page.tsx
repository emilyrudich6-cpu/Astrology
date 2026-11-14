import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTRY_FIELDS } from "@/lib/journal";
import { journalCompareAccess } from "@/lib/journal-access";
import { compareEntry } from "@/lib/journal-compare";
import { birthFromRow } from "@/lib/pipeline";
import DeepDiveGate from "@/components/DeepDiveGate";
import CompareView from "@/components/journal/CompareView";

export const metadata: Metadata = { title: "Compare with my timeline · Vertex Point", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Compare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await journalCompareAccess();
  if (access.state === "off") notFound();
  if (access.state === "signin") redirect(`/login?mode=signin&next=${encodeURIComponent(`/seeing-numbers/${id}`)}`);
  if (access.state === "upgrade") return <section className="narrow" style={{ padding: "36px 22px 90px" }}><DeepDiveGate next="/seeing-numbers" /></section>;
  // Only the member's own entry: someone else's id is a 404, not a leak
  const { data: e } = await supabaseAdmin().from("journal_entries").select(ENTRY_FIELDS).eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!e) notFound();
  const p = access.profile;
  return <CompareView entry={e} c={compareEntry(e, p.birth_date ? birthFromRow(p) : null)} />;
}
