import ChartWheel from "@/components/ChartWheel";
import PrintButton from "./PrintButton";
import { Rich, Inline, byId } from "./Rich";
import type { SynastryDoc } from "@/lib/synastry-doc";

const TAG_CLASS: Record<string, string> = {
  SWEET: "tag-sweet", HEAT: "tag-heat", GLUE: "tag-glue", INTENSE: "tag-intense", ELECTRIC: "tag-electric", FOGGY: "tag-foggy", FRICTION: "tag-friction",
};

export default function SynastryView({ doc }: { doc: SynastryDoc }) {
  const { calc: c, text: t } = doc;
  const A = c.header.a, B = c.header.b;
  const rows: [string, keyof typeof A][] = [["Born", "born"], ["Sun", "sun"], ["Moon", "moon"], ["Rising", "rising"], ["Venus", "venus"], ["Mars", "mars"], ["Born with", "bornWith"]];
  const aspect = (id: string) => c.aspects.find(a => a.id === id);
  const overlayTable = (rowsIn: typeof c.aInB, notes: typeof t.aInB, owner: string, guest: string) => rowsIn && (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead><tr><th scope="col">{guest}'s planet</th><th scope="col">In {owner}'s house</th><th scope="col">What it means</th><th scope="col">How it feels to {owner}</th></tr></thead>
        <tbody>{rowsIn.map((r, i) => {
          const n = byId(notes, r.id, i);
          return <tr key={r.id}><th scope="row">{r.planet}</th><td>{r.where.replace(`${owner}'s `, "")}</td><td><Inline text={n?.meaning ?? ""} /></td><td className="doc-feel">{n?.feel}</td></tr>;
        })}</tbody>
      </table>
    </div>
  );

  return (
    <div className="doc" data-footer={`${A.name} + ${B.name} · Synastry · For entertainment and self-reflection`}>
      <header className="doc-cover doc-cover-duo">
        <div className="doc-duo-wheels" aria-hidden="true">
          {c.wheels.map((w, i) => <ChartWheel key={i} planets={w.planets} cusps={w.cusps} asc={w.asc} label={i ? B.name : A.name} />)}
        </div>
        <div className="doc-cover-text">
          <h1>{A.name} + {B.name}</h1>
          <p className="doc-cover-sub">{c.header.subtitle}</p>
          <PrintButton />
        </div>
      </header>

      <div className="doc-table-wrap">
        <table className="doc-table doc-versus">
          <thead><tr><th scope="col"></th><th scope="col">{A.name}</th><th scope="col">{B.name}</th></tr></thead>
          <tbody>{rows.map(([label, k]) => <tr key={k}><th scope="row">{label}</th><td>{A[k]}</td><td>{B[k]}</td></tr>)}</tbody>
        </table>
      </div>

      <section className="doc-section">
        <h2>The vibe in one breath</h2>
        <Rich text={t.vibe} />
        {t.top5?.length > 0 && (
          <div className="doc-callout">
            <h3>Top {t.top5.length} signatures</h3>
            <ol className="doc-list">{t.top5.map(x => {
              const a = aspect(x.id);
              return <li key={x.id}><strong>{a?.aspect}</strong>{a ? ` (${a.orb} orb)` : ""}: <Inline text={x.line} /></li>;
            })}</ol>
          </div>
        )}
        {c.header.note.map((n, i) => <p key={i} className="doc-fine">{n}</p>)}
      </section>

      {(c.aInB || c.bInA) && (
        <section className="doc-section">
          <h2>Side by side: who lands in whose house</h2>
          <p className="doc-intro">The house is the part of life the other person lights up.</p>
          {c.aInB && <><h3 className="doc-h3">{A.name}'s planets in {B.name}'s chart</h3>{overlayTable(c.aInB, t.aInB, B.name, A.name)}</>}
          {c.bInA && <><h3 className="doc-h3">{B.name}'s planets in {A.name}'s chart</h3>{overlayTable(c.bInA, t.bInA, A.name, B.name)}</>}
        </section>
      )}

      <section className="doc-section">
        <h2>The aspects that matter</h2>
        <p className="doc-intro">Tightest first. A smaller orb means a louder, more constant effect.</p>
        <div className="doc-aspects">
          {c.aspects.map((a, i) => {
            const n = byId(t.aspects, a.id, i);
            return (
              <div key={a.id} className="doc-aspect">
                <span className={`doc-tag ${TAG_CLASS[n?.tag ?? ""] ?? ""}`}>{n?.tag ?? ""}</span>
                <div>
                  <h4>{a.aspect} <span className="doc-sub">orb {a.orb}</span></h4>
                  <Rich text={n?.text} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {t.retroTitle && (
        <section className="doc-section">
          <h2>{t.retroTitle}</h2>
          <Rich text={t.retroText} />
        </section>
      )}

      {t.keyDates?.length > 0 && (
        <section className="doc-section">
          <h2>The next key dates</h2>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead><tr><th scope="col">Date</th><th scope="col">Sky event</th><th scope="col">For {A.name} + {B.name}</th></tr></thead>
              <tbody>{t.keyDates.map(k => {
                const e = c.keyDates.find(x => x.id === k.id);
                return e ? <tr key={k.id}><th scope="row">{e.date}</th><td>{e.sky}</td><td><Inline text={k.forBoth} /></td></tr> : null;
              })}</tbody>
            </table>
          </div>
        </section>
      )}

      <section className="doc-section">
        <h2>The bottom line</h2>
        <Rich text={t.bottomLine} />
        {t.ritual?.title && (
          <div className="doc-callout">
            <h3>{t.ritual.title}</h3>
            <Rich text={t.ritual.text} />
          </div>
        )}
      </section>

      <p className="doc-fine">Tropical zodiac, Placidus houses. For entertainment and self-reflection: it describes tendencies, not anyone's feelings or choices.</p>
    </div>
  );
}
