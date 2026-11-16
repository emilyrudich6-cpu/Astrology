import Link from "next/link";
import type { Metadata } from "next";
import ChartWheel from "@/components/ChartWheel";
import { StackTable } from "@/components/reading/DeepDiveView";
import { natalChart } from "@/lib/engine/natal";
import { monthAhead } from "@/lib/month-ahead";
import { ONE_TIME, BRAND } from "@/lib/config";
import { availability } from "@/lib/offers";

export const metadata: Metadata = {
  title: "Example Natal Chart Deep Dive · Vertex Point",
  description: "See what a Natal Chart Deep Dive looks like: the summary tables, the angles, the planets and a dated timeline, shown for a fictional chart.",
};
export const revalidate = 86400; // the timeline dates move with the calendar

// The same fictional Mara as the Compatibility example. Her birth details are made up.
const MARA = { name: "Mara", date: "1993-04-17", time: "21:15", timezone: "America/Los_Angeles", latitude: 45.5152, longitude: -122.6784, place: "Portland" };

const GLANCE: string[][] = [
  ["Rising: Scorpio", "You read a room before you say a word.", "People find you magnetic and a little hard to read."],
  ["Sun: Aries, 6th house", "Restless unless there's something to start or fix.", "You lead through the work itself: first in, hands on."],
  ["Moon: Pisces, 4th house", "You soak up the mood at home like weather.", "You need a quiet, private place to reset."],
  ["Chart ruler: Pluto in Scorpio, 1st house", "All or nothing. Halfway doesn't interest you.", "You reinvent yourself every few years, on purpose."],
  ["Mercury and Venus: Aries, 5th house", "You know what you want the moment you see it.", "Flirting, pitching and making things all happen fast."],
];

const SECTIONS: { title: string; paras: string[] }[] = [
  { title: "The Angles", paras: [
    "**Ascendant, 13° Scorpio.** Your rising sign is the first thing people meet. In Scorpio it's quiet intensity: you watch before you speak, and people sense there's more going on than you're showing. You don't do small talk for long. Your ruler, Pluto, sits in your own sign and your own 1st house, which doubles this. You come across as someone who has already been through something and came out sharper.",
    "**Midheaven, 25° Leo.** This is the public you: what you're known for. Leo here wants work with your name on it, where being seen is part of the job. Pluto squares this point within a quarter of a degree, the tightest contact to any angle in your chart. Your reputation gets rebuilt more than once. Each time you outgrow a role, the next one is bigger.",
  ] },
  { title: "Planets & Aspects", paras: [
    "**Sun in Aries, 6th house.** Your identity lives in your daily work. You feel most like yourself when you're solving a problem with your hands on it. Your Sun makes a sextile to Saturn that is almost exact, 0.02° apart. That is rare, and it gives your Aries fire something most Aries Suns lack: follow-through. You start fast and you also finish.",
    "**Sun square Mars in Cancer.** This is the friction in your chart. Your drive runs through your feelings, so when you're hurt you get busy, and when you're overworked you get sharp with the people closest to you. The fix is physical: move first, talk second.",
    "**Moon in Pisces, 4th house.** Underneath the directness you are soft. You pick up other people's moods without trying, especially at home. Time alone isn't a luxury for you. It's how you find out which feelings are actually yours.",
    "**Mercury and Venus together in Aries, 5th house.** These two sit half a degree apart, so how you talk and what you love are the same thing. You're charming because you're direct. Venus was retrograde when you were born, which usually shows up as a private, slow-forming sense of your own taste, and an early lesson that being wanted isn't the same as being valued.",
    "**Mars trine Pluto.** Stamina. When you decide something matters, you can outlast almost anyone, and you do it calmly.",
  ] },
  { title: "The Houses", paras: [
    "**3rd house: Uranus and Neptune in Capricorn.** How you think and speak has an unusual edge. You see where systems are about to break, and you put it into words before other people notice. Writing, teaching or speaking on camera suits this.",
    "**4th house: Saturn in Aquarius, with your Moon.** Home came with responsibility early. As an adult you build a home life on your own terms, and it steadies everything else.",
    "**11th house: Jupiter in Libra.** Your luck arrives through people. Friends, audiences and collaborators open doors for you more than institutions do. Jupiter was retrograde at your birth, so the growth is quiet at first and obvious later.",
  ] },
];

const MORE = ["Every aspect, ranked by tightness", "Planet speeds and what they change", "Your natal retrogrades", "The next retrograde periods and how they'll hit you", "Harmonic charts: hidden talents",
  "Dominant planets, elements and fixed stars", "Progressions: where you are now", "A two-year timeline of exact dates", "Numerology", "The ten things in your chart that matter most", "A ritual tied to your next key date"];

const rich = (s: string) => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : p);

export default async function SampleDeepDive() {
  const c = natalChart(MARA);
  const ahead = monthAhead(MARA);
  const can = (await availability().catch(() => null))?.deepdive ?? false;
  const cta = can
    ? <Link className="btn primary" href={`/login?next=${encodeURIComponent("/buy/deepdive")}`}>{ONE_TIME.deepdive.cta} · {ONE_TIME.deepdive.price}</Link>
    : <span className="hint">The Natal Chart Deep Dive is coming soon.</span>;
  return (
    <section className="reading narrow">
      <article className="deepdive">
        <p className="sample-note">Example. Mara is fictional, and so are her birth details. This is an excerpt: your own Deep Dive is written from your chart and is several times longer.</p>
        <h1>Mara's Natal Chart Deep Dive</h1>
        <p className="hint">April 17, 1993 · 9:15 PM · Portland</p>
        <div className="dd-top">
          <div className="dd-wheel">
            <ChartWheel label="Mara's birth chart" planets={c.planets} cusps={c.houseCusps?.map(h => h.lon)} asc={c.angles?.[0].lon ?? null} aspects={c.aspects} />
          </div>
          <StackTable caption="At a glance" head={["Placement", "How it feels", "How it shows up"]} rows={GLANCE} />
          <StackTable narrow caption="Placements" head={["Planet", "Sign and degree", "House"]}
            rows={c.planets.map(p => [p.name + (p.retrograde ? " (retrograde)" : ""), p.position, p.house ? String(p.house) : ""])} />
        </div>
        <p>{cta}</p>
        <p className="hint">Tap a heading to read that part.</p>
        {SECTIONS.map((s, i) => (
          <details key={s.title} className="fold" open={i === 0}>
            <summary><h2>{s.title}</h2></summary>
            {s.paras.map((p, j) => <p key={j}>{rich(p)}</p>)}
          </details>
        ))}
        {ahead && (
          <details className="fold">
            <summary><h2>Your Timeline</h2></summary>
            <p className="hint">Three of Mara's dates over the next 30 days. The full report maps two years of them.</p>
            {ahead.items.map((x, i) => <p key={i}><strong className="hl">{x.when}</strong> <strong>{x.title.replace(/\byour\b/g, "her")}.</strong> {x.text.replace(/\byour\b/g, "her")}</p>)}
          </details>
        )}
        <h2 style={{ marginTop: "1.6em" }}>Also in the full report</h2>
        <ul className="sample-more">{MORE.map(m => <li key={m}>{m}</li>)}</ul>
        <p style={{ marginTop: 24 }}>{cta}</p>
        <p className="hint">A single payment. Written from your birth date, time and place, usually within a few minutes. <Link href="/chart">Start with your free chart</Link>.</p>
        <p className="hint"><em>{BRAND.disclaimer}</em></p>
      </article>
    </section>
  );
}
