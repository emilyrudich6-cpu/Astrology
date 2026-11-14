import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTRY_FIELDS } from "@/lib/journal";
import { journalCompareAccess } from "@/lib/journal-access";
import { buildRecap } from "@/lib/journal-recap";
import { birthFromRow } from "@/lib/pipeline";
import DeepDiveGate from "@/components/DeepDiveGate";
import RecapView, { shiftMonth } from "@/components/journal/RecapView";

export const metadata: Metadata = { title: "Your monthly recap · Seeing Numbers", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Recap({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const access = await journalCompareAccess();
  if (access.state === "off") notFound();
  if (access.state === "signin") redirect(`/login?mode=signin&next=${encodeURIComponent("/seeing-numbers/recap")}`);
  if (access.state === "upgrade") return <section className="narrow" style={{ padding: "36px 22px 90px" }}><DeepDiveGate next="/seeing-numbers" /></section>;
  const q = (await searchParams).m;
  const db = supabaseAdmin();
  let month = q && /^\d{4}-\d{2}$/.test(q) ? q : "";
  if (!month) {
    // Open on the month of their latest sighting (by the date where they saw it)
    const { data: last } = await db.from("journal_entries").select("seen_local_date").eq("user_id", access.user.id).order("seen_local_date", { ascending: false }).limit(1);
    month = last?.[0]?.seen_local_date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  }
  // Months follow the local calendar date of each sighting, so 11:58 pm on the 30th stays in that month
  const { data: entries } = await db.from("journal_entries").select(ENTRY_FIELDS).eq("user_id", access.user.id)
    .gte("seen_local_date", `${month}-01`).lt("seen_local_date", `${shiftMonth(month, 1)}-01`).order("seen_at", { ascending: true });
  const p = access.profile;
  return <RecapView month={month} count={entries?.length ?? 0} r={buildRecap(entries ?? [], p.birth_date ? birthFromRow(p) : null)} />;
}
