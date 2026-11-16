// On the free chart: a few real facts from this visitor's own chart with the explanation saved for the
// Deep Dive, plus one real upcoming date in full. Everything is calculated from their chart; nothing is filler.
import Link from "next/link";
import type { NatalChart, BirthData } from "@/lib/engine/natal";
import { monthAhead } from "@/lib/month-ahead";
import { ONE_TIME, TIERS } from "@/lib/config";

const ord = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
const PLANETS = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];

export function chartFacts(c: NatalChart, skip: string[] = []): { label: string; fact: string }[] {
  const out: { label: string; fact: string }[] = [];
  const ruler: any = (c as any).chartRuler?.[0];
  if (ruler && !skip.includes(ruler.planet)) out.push({ label: "Your chart ruler", fact: `${ruler.planet} in ${String(ruler.position).split(" ").pop()}${ruler.house ? `, in your ${ord(ruler.house)} house` : ""}` });
  const pat: any = ((c as any).patterns ?? []).find((p: any) => !p.planets.some((x: string) => skip.includes(x)));
  if (pat) out.push({ label: "A pattern in your chart", fact: pat.pattern === "stellium" ? `A stellium ${pat.detail}: ${pat.planets.join(", ")}` : `A ${pat.pattern} between ${pat.planets.join(", ")}` });
  const tight: any = [...(c.aspects as any[])].filter(a => a.major && PLANETS.includes(a.a) && PLANETS.includes(a.b) && !skip.includes(a.a) && !skip.includes(a.b)).sort((x, y) => x.orb - y.orb)[0];
  if (tight) out.push({ label: "Your tightest aspect", fact: `${tight.a} ${tight.aspect} ${tight.b}, ${tight.orb}° from exact` });
  const shape: any = (c as any).chartShape;
  if (shape?.shape && out.length < 3) out.push({ label: "Your chart shape", fact: `${/^[AEIOU]/.test(shape.shape) ? "An" : "A"} ${shape.shape} chart` });
  return out.slice(0, 3);
}

export default function DeepDiveTeaser({ chart, birth, uncertain = [], canBuy }: { chart: NatalChart; birth: BirthData; uncertain?: string[]; canBuy: boolean }) {
  // Without a birth time the Moon can be several degrees off, so nothing is claimed about it
  const facts = chartFacts(chart, birth.time ? uncertain : [...uncertain, "Moon"]);
  const next = birth.time ? monthAhead(birth)?.items[0] : null; // dates need a birth time to be exact
  if (!facts.length && !next) return null;
  return (
    <section className="teaser" aria-labelledby="teaser-h">
      <h2 id="teaser-h">What stands out in your chart</h2>
      {facts.length > 0 && (
        <ul className="teaser-facts">
          {facts.map(f => (
            <li key={f.label}>
              <span className="teaser-label">{f.label}</span>
              <strong>{f.fact}</strong>
              <span className="teaser-lock"><span aria-hidden="true">🔒</span> What this means for you is in your Deep Dive</span>
            </li>
          ))}
        </ul>
      )}
      {facts.length > 0 && (
        <p className="teaser-cta">
          {canBuy
            ? <Link className="btn" href={`/login?next=${encodeURIComponent("/buy/deepdive")}`}>{ONE_TIME.deepdive.cta} · {ONE_TIME.deepdive.price}</Link>
            : <span className="hint">The Natal Chart Deep Dive is coming soon.</span>}
          <Link href="/deep-dive">See an example</Link>
        </p>
      )}
      {next && (
        <div className="teaser-date">
          <span className="teaser-label">One date from your timeline, free</span>
          <p><strong className="hl">{next.when}</strong> <strong>{next.title}.</strong> {next.text}</p>
          <p className="hint">Members get three of these every month, plus a timeline of every exact date. <Link href="/#plans">{TIERS.deep.label}, {TIERS.deep.price.replace(" / ", "/")}</Link></p>
        </div>
      )}
    </section>
  );
}
