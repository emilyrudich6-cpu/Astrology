import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTRY_FIELDS } from "@/lib/journal";
import { journalCompareAccess } from "@/lib/journal-access";
import { compareEntry } from "@/lib/journal-compare";
import { birthFromRow } from "@/lib/pipeline";
import { whenLabel } from "@/lib/seeing-numbers";
import DeepDiveGate from "@/components/DeepDiveGate";

export const metadata: Metadata = { title: "Compare with my timeline · Vertex Point", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function Compare({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const access = await journalCompareAccess();
  if (access.state === "off") notFound();
  if (access.state === "signin") redirect(`/login?mode=signin&next=${encodeURIComponent(`/seeing-numbers/${id}`)}`);
  if (access.state === "upgrade") return <section className="narrow" style={{ padding: "36px 22px 90px" }}><DeepDiveGate next="/seeing-numbers" /></section>;
  const { data: e } = await supabaseAdmin().from("journal_entries").select(ENTRY_FIELDS).eq("id", id).eq("user_id", access.user.id).maybeSingle();
  if (!e) notFound();
  const p = access.profile;
  const c = compareEntry(e, p.birth_date ? birthFromRow(p) : null);
  const numberSide = (
    <div className="cmp-col">
      <h3>The number</h3>
      <p className="cmp-big">{e.number_raw}</p>
      <p>{c.meaning?.meaning ?? "There's no traditional reading for this exact sequence, so it's yours to interpret."}</p>
    </div>
  );
  const skySide = (
    <div className="cmp-col">
      <h3>Your sky that day</h3>
      {c.chartMissing ? <p className="hint">Your timeline isn't available for this entry. <Link href="/onboarding?next=/seeing-numbers">Check your birth details</Link>.</p>
        : c.transits.length === 0 ? <p className="hint">No major transits were touching your chart that day. A quiet sky can make small signs easier to notice.</p>
        : c.transits.map(t => (
          <div key={t.label} className="cmp-transit">
            <p className="cmp-transit-name">{t.label}</p>
            <p>{t.plain}</p>
            {(t.from || t.exact.length > 0) && <p className="hint">{t.from && t.to ? `In effect ${t.from} to ${t.to}. ` : ""}{t.exact.length ? `Exact on ${t.exact.join(", ")}.` : ""}</p>}
          </div>
        ))}
    </div>
  );
  return (
    <section className="narrow cmp" style={{ padding: "36px 22px 90px" }}>
      <p><Link href={`/seeing-numbers#entry-${e.id}`}>Back to my journal</Link></p>
      <h1 style={{ fontSize: "var(--step-3)" }}>{e.number_raw}</h1>
      <p className="hint">{whenLabel(e)}</p>
      {e.note && <blockquote className="cmp-note">{e.note}</blockquote>}
      {c.overlap ? (
        <>
          <p className="cmp-meet">Your note mentions {c.themes.find(t => t.key === c.overlap!.theme)?.label}, and {c.overlap.planet} was active in your chart that day. Take that as a prompt, not a verdict.</p>
          <div className="cmp-grid">{numberSide}{skySide}</div>
        </>
      ) : <div className="cmp-grid">{numberSide}{skySide}</div>}
      <div className="cmp-question">
        <p className="hint">A question to sit with</p>
        <p><em>{c.question}</em></p>
      </div>
    </section>
  );
}
