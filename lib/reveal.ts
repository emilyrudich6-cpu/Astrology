// The chart reveal: one short insight read straight from the person's own chart.
// It looks at how the Sun (what you want) and Moon (what you need) relate, which every chart has.
// If the Moon's sign is uncertain (no birth time and it changed sign that day), it uses the chart's strongest planet instead.
import { signByName } from "./signs";
import { PLANET_TAKEAWAY } from "./engine/dominant";

type Aspect = { a: string; b: string; aspect: string; orb: number; major?: boolean };
type Chart = { planets: { name: string; sign: string }[]; aspects: Aspect[] };

const COMPATIBLE: Record<string, string> = { Fire: "Air", Air: "Fire", Earth: "Water", Water: "Earth" };

export interface Insight { title: string; text: string; basis: string }

export function revealInsight(c: Chart, moonUncertain: boolean, dominant?: { planet: string; sign: string } | null): Insight | null {
  const sun = c.planets.find(p => p.name === "Sun")?.sign, moon = c.planets.find(p => p.name === "Moon")?.sign;
  if (!sun) return null;
  if (!moon || moonUncertain) {
    if (!dominant || !PLANET_TAKEAWAY[dominant.planet]) return null;
    return { title: `${dominant.planet} in ${dominant.sign} leads your chart`, text: PLANET_TAKEAWAY[dominant.planet], basis: "Your strongest planet, by position and aspects" };
  }
  const sm = c.aspects.find(a => a.major !== false && ((a.a === "Sun" && a.b === "Moon") || (a.a === "Moon" && a.b === "Sun")));
  const orb = sm ? ` (${sm.orb}° from exact)` : "";
  const basis = sm ? `Your Sun ${sm.aspect} Moon${orb}` : `Your ${sun} Sun and ${moon} Moon`;
  if (sm) {
    const t: Record<string, Insight> = {
      conjunction: { title: "What you want and what you need line up", text: `Your Sun and Moon sit together in ${sun}. Head and heart usually agree, so when something is right for you, you tend to know it all at once.`, basis },
      opposition: { title: "You were born under a full Moon", text: `Your ${sun} Sun faces your ${moon} Moon. You see both sides of most things, and part of your life is learning to let them work together instead of taking turns.`, basis },
      square: { title: "Your drive and your needs push on each other", text: `Your ${sun} Sun and ${moon} Moon pull in different directions. That tension is restless, but it's also what keeps you growing and getting things done.`, basis },
      trine: { title: "Your heart and your goals move easily together", text: `Your ${sun} Sun and ${moon} Moon flow with each other. You tend to feel at home in your own choices, which reads to others as ease.`, basis },
      sextile: { title: "Your heart and your goals help each other", text: `Your ${sun} Sun and ${moon} Moon cooperate. When you act on what you feel, things tend to open up, but you have to make the first move.`, basis },
    };
    if (t[sm.aspect]) return t[sm.aspect];
  }
  const se = signByName(sun)?.element, me = signByName(moon)?.element;
  if (!se || !me) return null;
  if (se === me) return { title: `A double dose of ${se.toLowerCase()}`, text: `Your ${sun} Sun and ${moon} Moon are both ${se.toLowerCase()} signs. What you show the world and what you feel inside speak the same language, so people tend to get the real you quickly.`, basis };
  if (COMPATIBLE[se] === me) return { title: "Your outside and inside work as a team", text: `Your ${sun} Sun is ${se.toLowerCase()} and your ${moon} Moon is ${me.toLowerCase()}, elements that feed each other. What you go after and what comforts you tend to support each other.`, basis };
  return { title: "You're more layered than you first appear", text: `Your ${sun} Sun is ${se.toLowerCase()}, but your ${moon} Moon is ${me.toLowerCase()}. People meet one side of you first; the people who stay get to know the other.`, basis };
}

/** First sentence of a sign description, for the reveal cards */
export const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();
