// Monthly recap: recurring numbers and themes, built only from the member's own entries.
import Link from "next/link";
import type { buildRecap } from "@/lib/journal-recap";
import { whenLabel } from "@/lib/seeing-numbers";

export const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
export const shiftMonth = (m: string, by: number) => { const [y, mo] = m.split("-").map(Number); return new Date(Date.UTC(y, mo - 1 + by, 1)).toISOString().slice(0, 7); };

export default function RecapView({ month, count, r }: { month: string; count: number; r: ReturnType<typeof buildRecap> }) {
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      <p><Link href="/seeing-numbers">Back to my journal</Link></p>
      <h1 style={{ fontSize: "var(--step-3)" }}>{monthLabel(month)}</h1>
      <p className="hint"><Link href={`/seeing-numbers/recap?m=${shiftMonth(month, -1)}`}>{monthLabel(shiftMonth(month, -1))}</Link>{" · "}<Link href={`/seeing-numbers/recap?m=${shiftMonth(month, 1)}`}>{monthLabel(shiftMonth(month, 1))}</Link></p>
      {!count ? <p>No entries this month. When a number catches your eye, <Link href="/seeing-numbers">save it in your journal</Link>.</p> : (
        <>
          <p>You saved {count} {count === 1 ? "entry" : "entries"} this month.</p>
          {r.recurring.map(g => <p key={g.number} className="recap-line">{g.sentence}</p>)}
          {r.themes.length > 0 && <p className="hint">Your notes mentioned {r.themes.map(t => `${t.label} (${t.ids.length})`).join(", ")}.</p>}
          <ul className="sn-list">
            {r.rows.map(e => (
              <li key={e.id}>
                <div className="sn-row">
                  <span className="sn-num">{e.number_raw}</span>
                  <div>
                    <span className="hint">{whenLabel(e)}</span>
                    {e.note && <p className="sn-note">{e.note}</p>}
                    {e.transit && <p className="hint">That day: {e.transit}</p>}
                    <Link href={`/seeing-numbers/${e.id}`}>Compare with my timeline</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
