import Link from "next/link";
import type { Metadata } from "next";
import ChartWheel from "@/components/ChartWheel";
import { natalChart } from "@/lib/engine/natal";
import { synastry } from "@/lib/engine/transits";
import { ONE_TIME, TIERS } from "@/lib/config";

export const metadata: Metadata = {
  title: "Synastry Reading · Vertex Point",
  description: "Your chart next to theirs: attraction, communication, friction, the patterns you repeat, and when your timelines line up.",
};

// A fictional pair, clearly labeled. Their charts are calculated live; the written example below was based on these calculations.
const MARA = { name: "Mara", date: "1993-04-17", time: "21:15", timezone: "America/Los_Angeles", latitude: 45.5152, longitude: -122.6784, place: "Portland" };
const THEO = { name: "Theo", date: "1991-10-02", time: "07:40", timezone: "America/Chicago", latitude: 41.8781, longitude: -87.6298, place: "Chicago" };

const SECTIONS: { title: string; body: string[] }[] = [
  { title: "Attraction", body: [
    "Mara's Aries Sun lands in Theo's 7th house, the house of partnership. To Theo, she can feel less like a date and more like the person he's been waiting for. Her Sun also makes an easy trine to his Venus in Leo, less than a degree from exact: he admires her nerve, and she lights up around his warmth.",
    "Her Midheaven sits on his Venus too. Theo is drawn to what Mara is building in the world, and he's likely to be her loudest fan." ] },
  { title: "Communication", body: [
    "Mara's Jupiter sits almost exactly on Theo's Mercury and close to his Sun, all in Libra. Talking with her makes his ideas feel bigger and more possible. Conversations run long and generous.",
    "Theo's Sun, Mercury and Mars all fall in Mara's 11th house of friendship. Whatever else this is, it starts as two people who genuinely like each other." ] },
  { title: "Friction", body: [
    "Mara's Sun squares Theo's Cancer Moon within half a degree. Her directness is honest, but it can land on his softest spot. He may need more reassurance than she naturally thinks to give.",
    "Her Saturn opposes his Venus, so she can come across as the realist who questions his plans for pleasure and spending. Said with care, it steadies him. Said in a hurry, it stings." ] },
  { title: "The pattern you repeat", body: [
    "Mara's Neptune squares Theo's Mars and opposes his Midheaven, both within a degree. She can idealize where he's headed, then feel confused when his drive goes somewhere she didn't picture. The fix is simple and hard: ask, don't assume.",
    "Theo's Pluto sits in Mara's 1st house, near her Ascendant. Being with him changes how she sees herself. It's intense, and it's part of why this one doesn't feel casual." ] },
  { title: "When your timelines line up", body: [
    "From mid-November 2026 to mid-January 2027, Jupiter crosses Mara's Midheaven while it crosses Theo's Venus: a good window to make something public, like a move, a launch or an announcement together.",
    "At the same time, Saturn opposes Mara's Jupiter and Theo's Sun, so expect a reality check about what you can both carry. Late June to July 2027, Uranus trines her Jupiter and his Sun, bringing a lighter, more spontaneous stretch." ] },
];

export default function TwoOfYou() {
  const a = natalChart(MARA), b = natalChart(THEO);
  const top = synastry(a, b).aspects.filter((x: any) => x.major).sort((x: any, y: any) => x.orb - y.orb).slice(0, 6);
  const wheel = (c: typeof a, label: string) => (
    <ChartWheel label={label} asc={c.angles?.[0].lon ?? null} cusps={c.houseCusps?.map(h => h.lon) ?? null}
      planets={c.planets.map(p => ({ name: p.name, lon: p.lon, retrograde: p.retrograde }))} aspects={[]} />
  );
  const offer = ONE_TIME.synastry;
  return (
    <div className="duo">
      <section className="narrow duo-hero">
        <p className="duo-kicker">Synastry Reading</p>
        <h1>Now meet their chart <span className="rose">♡</span></h1>
        <p className="support">Your chart next to theirs, calculated to the minute: what pulls you together, how you talk, where you rub, the pattern you keep repeating, and the dates your timelines line up.</p>
        <div className="duo-wheels" aria-label="Two charts overlapping">
          <div className="w1">{wheel(a, "Mara's chart (fictional)")}</div>
          <div className="w2">{wheel(b, "Theo's chart (fictional)")}</div>
        </div>
        <div className="duo-cta">
          <Link className="btn brass" href={`/login?next=${encodeURIComponent("/dashboard")}`}>Get my synastry reading, {offer.price}</Link>
          <p className="hint">One-time. Both charts included, plus a free month of your own timeline. Or get {TIERS.deep.compatPerMonth} a month with <Link href="/#plans">Deep Dive, {TIERS.deep.price}</Link>.</p>
        </div>
      </section>

      <section className="narrow duo-example">
        <p className="duo-label">Example reading. Mara and Theo are fictional, and so are their birth details.</p>
        <h2>Mara & Theo</h2>
        <p className="hint">Mara: {a.bigThree.sun.replace(/^\S+\s/, "")} Sun, {a.bigThree.moon.replace(/^\S+\s/, "")} Moon, {a.bigThree.ascendant.replace(/^\S+\s/, "")} Rising. Theo: {b.bigThree.sun.replace(/^\S+\s/, "")} Sun, {b.bigThree.moon.replace(/^\S+\s/, "")} Moon, {b.bigThree.ascendant.replace(/^\S+\s/, "")} Rising.</p>
        {SECTIONS.map(s => (
          <article key={s.title} className="duo-sec">
            <h3>{s.title}</h3>
            {s.body.map((p, i) => <p key={i}>{p}</p>)}
          </article>
        ))}
        <details className="full">
          <summary>See their closest connections</summary>
          <table className="data">
            <thead><tr><th>Mara</th><th>Aspect</th><th>Theo</th><th>Orb</th></tr></thead>
            <tbody>{top.map((x: any, i: number) => <tr key={i}><td>{x.Mara}</td><td>{x.aspect}</td><td>{x.Theo}</td><td>{x.orb}°</td></tr>)}</tbody>
          </table>
        </details>
        <div className="duo-cta" style={{ marginTop: 30 }}>
          <Link className="btn brass" href={`/login?next=${encodeURIComponent("/dashboard")}`}>Get yours, {offer.price}</Link>
        </div>
      </section>
    </div>
  );
}
