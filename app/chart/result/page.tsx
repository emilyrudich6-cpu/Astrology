import Link from "next/link";
import type { Metadata } from "next";
import ChartWheel from "@/components/ChartWheel";
import { DominantText, TopicInsight, ChartActions } from "@/components/FreeResult";
import { freeChart } from "@/lib/freechart-server";
import { signOf } from "@/lib/engine/core";
import { chartSignature, PLANET_TAKEAWAY } from "@/lib/engine/dominant";
import { signByName } from "@/lib/signs";
import NewsletterSignup from "@/components/NewsletterSignup";

export const metadata: Metadata = { title: "Your chart · Vertex Point", robots: { index: false } };
export const dynamic = "force-dynamic";

const GLYPH: Record<string, string> = { Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇" };
const ord = (n: number) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const T = "︎";

export default async function Result({ searchParams }: { searchParams: Promise<{ b?: string }> }) {
  const token = (await searchParams).b ?? "";
  const fc = freeChart(token);
  if (!fc) {
    return (
      <section className="narrow" style={{ paddingBlock: 40 }}>
        <h1 style={{ fontSize: "var(--step-3)" }}>We couldn't read that chart link</h1>
        <p className="hint">It may have been cut short when it was copied. Enter your birth details again and we'll recalculate it.</p>
        <Link className="btn" href="/chart">Calculate my chart</Link>
      </section>
    );
  }
  const { b, chart: c, uncertain, dominant: d } = fc;
  const unc = Object.fromEntries(uncertain.map(u => [u.planet, u.signs]));
  const P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const rising = c.angles ? signOf(c.angles[0].lon) : null;
  const who = b.name && b.name !== "You" ? `${b.name}'s chart` : "Your chart";
  const born = new Date(b.date + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  const shareUrl = `/share?s=${P.Sun.sign}&m=${unc.Moon ? "" : P.Moon.sign}${rising ? `&r=${rising}` : ""}${b.name !== "You" ? `&n=${encodeURIComponent(b.name)}` : ""}`;
  const signText = (name: string) => (unc[name] ? `${unc[name][0]} or ${unc[name][1]}` : P[name].sign);
  const pl = c.planets.find(p => p.name === d.planet)!;
  const fallback =
    `${d.planet} in ${d.sign}${d.house ? `, in your ${ord(d.house)} house,` : ""} carries the most weight in your chart. ` +
    (d.reasons.length ? `It stands out because ${d.reasons.slice(0, 3).join(", and ")}. ` : "") +
    (d.keyAspect ? `Its closest link is a ${d.keyAspect.aspect} to your ${d.keyAspect.with}, ${d.keyAspect.orb}° from exact.` : "") +
    `\n\nIn plain English: ${PLANET_TAKEAWAY[d.planet]}`;
  const sig = chartSignature(c, fc.uncertainNames);
  const sigInfo = sig ? signByName(sig.sign) : null;
  const bigThreeLinks = [
    { lab: "Sun", sign: P.Sun.sign, tab: "" },
    ...(unc.Moon ? [] : [{ lab: "Moon", sign: P.Moon.sign, tab: "?tab=moon" }]),
    ...(rising ? [{ lab: "Rising", sign: rising, tab: "?tab=rising" }] : []),
  ];

  return (
    <div className="narrow result">
      <header className="result-head">
        <h1 style={{ fontSize: "var(--step-3)", marginBottom: 4 }}>{who}</h1>
        <p className="hint">{born}{b.time ? ` at ${b.time}` : ", time unknown"}, {b.place}</p>
      </header>

      <ChartWheel label={`${who} wheel`} asc={c.angles?.[0].lon ?? null} cusps={c.houseCusps?.map(h => h.lon) ?? null}
        planets={c.planets.map(p => ({ name: p.name, lon: p.lon, retrograde: p.retrograde }))}
        aspects={c.aspects.filter(a => a.major).map(a => ({ a: a.a, b: a.b, aspect: a.aspect }))} />

      <h2 className="sr-only">Your Big Three</h2>
      <div className="big3">
        <div><span className="lab">Sun</span><span className="val">{P.Sun.sign}</span><span className="deg">{Math.floor(P.Sun.degree)}°</span></div>
        <div><span className="lab">Moon</span><span className="val">{unc.Moon ? "?" : P.Moon.sign}</span><span className="deg">{unc.Moon ? `${unc.Moon[0]} or ${unc.Moon[1]}` : `${Math.floor(P.Moon.degree)}°`}</span></div>
        <div><span className="lab">Rising</span><span className="val">{rising ?? "—"}</span><span className="deg">{rising ? `${Math.floor(c.angles![0].lon % 30)}°` : "needs birth time"}</span></div>
      </div>
      {!b.time && (
        <p className="notice">Without a birth time we've left out your Rising sign and houses.{uncertain.length > 0 && <> Your {uncertain.map(u => u.planet).join(" and ")} changed sign on the day you were born, so {uncertain.length > 1 ? "those are" : "that's"} marked as uncertain.</>} <Link href="/chart">Add your birth time</Link> to see the rest.</p>
      )}

      <p className="other-signs no-print"><span className="hint">Find your other signs:</span>{" "}
        {bigThreeLinks.map((x, i) => <span key={x.lab}>{i > 0 && ", "}<Link href={`/signs/${signByName(x.sign)!.slug}${x.tab}`}>{x.sign} {x.lab}</Link></span>)}
      </p>

      <h2 className="sec">Your placements</h2>
      <ul className="placements">
        {c.planets.map(p => (
          <li key={p.name}>
            <span><span className="g" aria-hidden>{GLYPH[p.name] + T}</span>{p.name}</span>
            <span>{signText(p.name)}{p.house ? <span className="hint">, {ord(p.house)} house</span> : null}{p.retrograde && <span className="flag"> ℞</span>}{unc[p.name] && <span className="flag"> uncertain</span>}</span>
          </li>
        ))}
      </ul>

      <details className="full">
        <summary>See the full chart details</summary>
        <h3>Planets</h3>
        <table className="data">
          <thead><tr><th>Planet</th><th>Position</th>{c.houseCusps && <th>House</th>}<th>Motion</th></tr></thead>
          <tbody>{c.planets.map(p => (
            <tr key={p.name}><td>{p.name}</td><td>{unc[p.name] ? `${p.position} (sign uncertain)` : p.position}</td>{c.houseCusps && <td>{p.house}</td>}<td>{p.retrograde ? "retrograde" : p.speedClass === "stationary" ? "stationary" : "direct"}{p.dignity && p.dignity !== "peregrine" ? `, ${p.dignity}` : ""}</td></tr>
          ))}</tbody>
        </table>
        {c.angles && (<>
          <h3>Angles</h3>
          <table className="data"><tbody>{c.angles.map(a => <tr key={a.name}><td>{a.name}</td><td>{a.position}</td></tr>)}</tbody></table>
        </>)}
        {c.houseCusps && (<>
          <h3>Houses <span className="hint">({c.houseSystem})</span></h3>
          <table className="data"><tbody>{c.houseCusps.map(h => <tr key={h.house}><td>{ord(h.house)}</td><td>{h.position}</td></tr>)}</tbody></table>
        </>)}
        <h3>Aspects</h3>
        <table className="data">
          <thead><tr><th>Between</th><th>Aspect</th><th>Orb</th></tr></thead>
          <tbody>{c.aspects.filter(a => a.major).map((a, i) => (
            <tr key={i}><td>{a.a} – {a.b}</td><td>{a.aspect}</td><td>{a.orb}° {a.motion}</td></tr>
          ))}</tbody>
        </table>
        <h3>Points</h3>
        <table className="data"><tbody>{c.points.filter(p => !p.name.includes("(mean)") || p.name.includes("Lilith")).map(p => (
          <tr key={p.name}><td>{p.name.replace(" (true)", "").replace(" (mean)", "")}</td><td>{p.position}{p.house ? `, ${ord(p.house)} house` : ""}</td></tr>
        ))}</tbody></table>
      </details>

      <section className="result-block">
        <h2 className="kicker-italic">But which planets run the show?</h2>
        <p className="dom-name"><span aria-hidden>{GLYPH[d.planet] + T}</span> {d.planet} in {d.sign}{d.house ? `, ${ord(d.house)} house` : ""}{pl.retrograde ? ", retrograde" : ""}</p>
        <DominantText b={token} fallback={fallback} />
        {sig && sigInfo && (
          <div className="card signature" style={{ ["--accent" as string]: sigInfo.accent }}>
            <p className="hint" style={{ marginBottom: 2 }}>Your Chart Signature</p>
            <h3>{sig.name}</h3>
            <p>Your chart leans most toward {sig.element.toLowerCase()} and the {sig.modality.toLowerCase()} quality, the combination that belongs to {sig.sign}. Even if {sig.sign} isn&apos;t in your Big Three, you may recognize its {sigInfo.essence}.</p>
            <Link className="link-arrow" href={`/signs/${sigInfo.slug}`}>Read about {sig.sign} →</Link>
          </div>
        )}
      </section>

      <section className="result-block">
        <h2 className="kicker-italic">Choose one short insight</h2>
        <TopicInsight b={token} />
      </section>

      <section className="result-block">
        <ChartActions b={token} shareUrl={shareUrl} />
      </section>

      <section className="result-block no-print">
        <NewsletterSignup />
      </section>

      <section className="result-block no-print">
        <p className="kicker-italic">And what are those stars saying right now?</p>
        <Link className="link-arrow" href="/#plans">Check your transits →</Link>
      </section>

      <section className="result-block no-print">
        <div className="card meet">
          <svg className="orbits" viewBox="0 0 160 160" aria-hidden>
            <circle cx="62" cy="80" r="46" fill="none" stroke="var(--silver)" />
            <circle cx="98" cy="80" r="46" fill="none" stroke="var(--silver)" />
          </svg>
          <h3>Now meet their chart ♡</h3>
          <p>The Two of You puts both charts side by side: attraction, communication, friction and the patterns you keep repeating.</p>
          <Link className="btn ghost small" href="/#plans">See The Two of You</Link>
        </div>
      </section>
    </div>
  );
}
