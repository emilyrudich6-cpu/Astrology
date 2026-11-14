import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase";
import { ENTRY_FIELDS } from "@/lib/journal";
import { journalCompareAccess } from "@/lib/journal-access";
import { buildRecap } from "@/lib/journal-recap";
import { birthFromRow } from "@/lib/pipeline";
import { whenLabel } from "@/lib/seeing-numbers";
import DeepDiveGate from "@/components/DeepDiveGate";

export const metadata: Metadata = { title: "Your monthly recap · Seeing Numbers", robots: { index: false } };
export const dynamic = "force-dynamic";

const monthLabel = (m: string) => new Date(`${m}-15T12:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
const shift = (m: string, by: number) => { const [y, mo] = m.split("-").map(Number); const d = new Date(Date.UTC(y, mo - 1 + by, 1)); return d.toISOString().slice(0, 7); };

export default async function Recap({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const access = await journalCompareAccess();
  if (access.state === "off") notFound();
  if (access.state === "signin") redirect(`/login?mode=signin&next=${encodeURIComponent("/seeing-numbers/recap")}`);
  if (access.state === "upgrade") return <section className="narrow" style={{ padding: "36px 22px 90px" }}><DeepDiveGate next="/seeing-numbers" /></section>;
  const q = (await searchParams).m;
  const db = supabaseAdmin();
  let month = q && /^\d{4}-\d{2}$/.test(q) ? q : "";
  if (!month) {
    const { data: last } = await db.from("journal_entries").select("seen_local_date").eq("user_id", access.user.id).order("seen_local_date", { ascending: false }).limit(1);
    month = last?.[0]?.seen_local_date.slice(0, 7) ?? new Date().toISOString().slice(0, 7);
  }
  const { data: entries } = await db.from("journal_entries").select(ENTRY_FIELDS).eq("user_id", access.user.id)
    .gte("seen_local_date", `${month}-01`).lt("seen_local_date", `${shift(month, 1)}-01`).order("seen_at", { ascending: true });
  const p = access.profile;
  const r = buildRecap(entries ?? [], p.birth_date ? birthFromRow(p) : null);
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      <p><Link href="/seeing-numbers">Back to my journal</Link></p>
      <h1 style={{ fontSize: "var(--step-3)" }}>{monthLabel(month)}</h1>
      <p className="hint"><Link href={`/seeing-numbers/recap?m=${shift(month, -1)}`}>← {monthLabel(shift(month, -1))}</Link> · <Link href={`/seeing-numbers/recap?m=${shift(month, 1)}`}>{monthLabel(shift(month, 1))} →</Link></p>
      {!entries?.length ? <p>No entries this month.</p> : (
        <>
          <p>You saved {entries.length} {entries.length === 1 ? "entry" : "entries"} this month.</p>
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
