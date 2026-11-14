// Compare with my timeline: the note, the number and the member's own transits that day, side by side.
import Link from "next/link";
import type { Comparison } from "@/lib/journal-compare";
import { whenLabel } from "@/lib/seeing-numbers";

type Entry = { id: string; number_raw: string; note: string | null; seen_local_date: string; seen_local_time: string | null };

export default function CompareView({ entry: e, c }: { entry: Entry; c: Comparison }) {
  const theme = c.overlap ? c.themes.find(t => t.key === c.overlap!.theme)?.label : null;
  return (
    <section className="narrow cmp" style={{ padding: "36px 22px 90px" }}>
      <p><Link href={`/seeing-numbers#entry-${e.id}`}>Back to my journal</Link></p>
      <h1 style={{ fontSize: "var(--step-3)" }}>{e.number_raw}</h1>
      <p className="hint">{whenLabel(e)}</p>
      {e.note && <blockquote className="cmp-note">{e.note}</blockquote>}
      {c.overlap && theme && (
        <p className="cmp-meet">Your note mentions {theme}, and {c.overlap.transit} was in effect that day. Take that as a prompt, not a verdict.</p>
      )}
      <div className="cmp-grid">
        <div className="cmp-col">
          <h3>The number</h3>
          <p className="cmp-big">{e.number_raw}</p>
          <p>{c.meaning?.meaning ?? "There's no traditional reading for this exact sequence, so it's yours to interpret."}</p>
        </div>
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
      </div>
      <div className="cmp-question">
        <p className="hint">A question to sit with</p>
        <p><em>{c.question}</em></p>
      </div>
    </section>
  );
}
