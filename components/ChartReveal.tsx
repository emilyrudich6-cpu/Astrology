// The free chart reveal: Sun, Moon and Rising as three cards, one insight from this chart, then the compare link.
// Sized to read (and screenshot) on a narrow phone.
import Link from "next/link";
import { signByName } from "@/lib/signs";
import { firstSentence, type Insight } from "@/lib/reveal";

const T = "︎"; // text presentation, so glyphs don't turn into emoji

type Card = { key: "sun" | "moon" | "rising"; planet: string; glyph: string; role: string; sign: string | null; alt?: [string, string] | null; degree: number | null };

export default function ChartReveal({ who, cards, insight, hasTime }: { who: string; cards: Card[]; insight: Insight | null; hasTime: boolean }) {
  return (
    <section className="reveal" aria-labelledby="reveal-h">
      <h2 id="reveal-h" className="sr-only">{who}: Sun, Moon and Rising</h2>
      <div className="reveal-cards">
        {cards.map(c => {
          const info = c.sign ? signByName(c.sign) : null;
          return (
            <div key={c.key} className={`reveal-card${c.sign ? "" : " unknown"}`}>
              <span className="reveal-glyph" aria-hidden>{c.glyph}</span>
              <p className="reveal-lab">{c.planet} · {c.role}</p>
              {c.sign && info ? (
                <>
                  <p className="reveal-sign"><span aria-hidden>{info.glyph + T}</span> {c.sign}{c.degree != null && <span className="reveal-deg"> {c.degree}°</span>}</p>
                  <p className="reveal-line">{firstSentence(info[c.key])}</p>
                </>
              ) : c.alt ? (
                <>
                  <p className="reveal-sign">{c.alt[0]} <span className="reveal-or">or</span> {c.alt[1]}</p>
                  <p className="reveal-line">The Moon changed sign on the day you were born. A birth time tells us which.</p>
                </>
              ) : (
                <>
                  <p className="reveal-sign">Needs your birth time</p>
                  <p className="reveal-line">Rising is the sign coming up on the eastern horizon at the minute you were born. It changes about every two hours, so without a time we leave it, and your houses, out instead of guessing. <Link href="/chart">Add your birth time</Link></p>
                </>
              )}
            </div>
          );
        })}
      </div>

      {insight && (
        <div className="reveal-insight">
          <p className="reveal-lab">One thing your chart shows</p>
          <p className="reveal-title">{insight.title}</p>
          <p className="reveal-text">{insight.text}</p>
          <p className="reveal-basis">Based on: {insight.basis}</p>
        </div>
      )}

      <Link className="btn primary block" href="/synastry">Compare my chart with someone ♡</Link>
      <p className="reveal-mark" aria-hidden>vertexpoint.talk</p>
    </section>
  );
}
