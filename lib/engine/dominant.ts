// "Which planets run the show?": a transparent dominance score, plus helpers for the free chart.
import { DateTime } from "luxon";
import { PLANETS, Planet, lonOf, signOf, angDist } from "./core";
import { NatalChart, BirthData, RULER_MODERN, RULER_TRADITIONAL, round } from "./natal";
import { transitTimeline, CATEGORY_FOCUS, natalTargets, HOUSE_THEMES } from "./transits";

export interface DominantResult {
  planet: Planet;
  score: number;
  reasons: string[];
  sign: string;
  house: number | null;
  keyAspect: { with: string; aspect: string; orb: number; motion: string } | null;
  runnersUp: { planet: Planet; score: number }[];
}

/** Scores the eight non-luminary planets (the Sun and Moon are already in the Big Three). */
export function dominantPlanet(c: NatalChart, uncertain: string[] = []): DominantResult {
  const ascSign = c.angles ? signOf(c.angles[0].lon) : null;
  const sunSign = c.planets[0].sign, moonSign = c.planets[1].sign;
  const stelliumSigns = c.patterns.filter(p => p.pattern === "stellium" && p.detail?.startsWith("in ") && !p.detail.includes("house"))
    .map(p => p.detail!.replace("in ", ""));
  const candidates = PLANETS.filter(p => p !== "Sun" && p !== "Moon");
  const scored = candidates.map(name => {
    const p = c.planets.find(x => x.name === name)!;
    let score = 0; const reasons: string[] = [];
    if (ascSign && (RULER_MODERN[ascSign as keyof typeof RULER_MODERN] === name || RULER_TRADITIONAL[ascSign as keyof typeof RULER_TRADITIONAL] === name)) {
      score += 3; reasons.push(`it rules your ${ascSign} Rising, which makes it your chart ruler`);
    }
    const angle = c.angles?.find(a => a.planetsWithin8.some(w => w.planet === name));
    if (angle) {
      const orb = angle.planetsWithin8.find(w => w.planet === name)!.orb;
      score += 3 - orb / 4; reasons.push(`it sits ${orb}° from your ${angle.name}, one of the four most visible points in a chart`);
    } else if (p.house && [1, 4, 7, 10].includes(p.house)) {
      score += 1.2; reasons.push(`it's in your ${ordinal(p.house)} house, an angular house where planets act strongly`);
    }
    if (p.dignity === "domicile" || p.dignity === "exaltation") { score += 2; reasons.push(`it's in ${p.dignity === "domicile" ? "its own sign" : "its sign of exaltation"} (${p.sign}), where it works at full strength`); }
    if (RULER_MODERN[sunSign as keyof typeof RULER_MODERN] === name || RULER_TRADITIONAL[sunSign as keyof typeof RULER_TRADITIONAL] === name) { score += 1.5; reasons.push(`it rules your ${sunSign} Sun`); }
    if (!uncertain.includes("Moon") && (RULER_MODERN[moonSign as keyof typeof RULER_MODERN] === name || RULER_TRADITIONAL[moonSign as keyof typeof RULER_MODERN] === name)) { score += 1; reasons.push(`it rules your ${moonSign} Moon`); }
    for (const s of stelliumSigns) if (RULER_MODERN[s as keyof typeof RULER_MODERN] === name) { score += 1.5; reasons.push(`it rules the ${s} stellium, the busiest sign in your chart`); }
    const mine = c.aspects.filter(a => a.major && (a.a === name || a.b === name));
    const lumAsp = mine.filter(a => ["Sun", "Moon"].includes(a.a === name ? a.b : a.a));
    if (lumAsp.length) { score += lumAsp.length; reasons.push(`it's in direct conversation with your ${lumAsp.map(a => (a.a === name ? a.b : a.a)).join(" and ")}`); }
    const aspScore = mine.reduce((s, a) => s + Math.max(0, (8 - a.orb) / 8), 0);
    score += aspScore * 0.6;
    if (mine.length >= 5) reasons.push(`it makes ${mine.length} major aspects, more than most planets in your chart`);
    if (p.speedClass === "stationary") { score += 2; reasons.push("it was standing still (stationary) when you were born, which concentrates its effect"); }
    if (p.outOfBounds) { score += 0.8; reasons.push("it's out of bounds, beyond the Sun's usual path, so it plays by its own rules"); }
    const tight = mine.slice().sort((x, y) => x.orb - y.orb)[0] ?? null;
    return {
      planet: name, score: round(score, 2), reasons, sign: p.sign, house: p.house,
      keyAspect: tight ? { with: tight.a === name ? tight.b : tight.a, aspect: tight.aspect, orb: tight.orb, motion: tight.motion } : null,
    };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  return { ...top, runnersUp: scored.slice(1, 3).map(s => ({ planet: s.planet, score: s.score })) };
}

const ordinal = (n: number) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");

/** With no birth time: which placements could be in a different sign depending on the hour */
export function uncertainPlacements(b: BirthData): { planet: string; signs: string[] }[] {
  if (b.time) return [];
  const [y, m, d] = b.date.split("-").map(Number);
  const start = DateTime.fromObject({ year: y, month: m, day: d, hour: 0 }, { zone: b.timezone }).toUTC().toJSDate();
  const end = DateTime.fromObject({ year: y, month: m, day: d, hour: 23, minute: 59 }, { zone: b.timezone }).toUTC().toJSDate();
  const out: { planet: string; signs: string[] }[] = [];
  for (const p of PLANETS) {
    const a = signOf(lonOf(p, start)), z = signOf(lonOf(p, end));
    if (a !== z) out.push({ planet: p, signs: [a, z] });
  }
  return out;
}

/** One dated moment from the next six months for Work or Personal Growth */
export function timelineSample(c: NatalChart, topic: "work" | "growth", from = new Date()) {
  const focus = topic === "work" ? CATEGORY_FOCUS.career : CATEGORY_FOCUS.growth;
  const end = new Date(from.getTime() + 183 * 86400000);
  const events = transitTimeline(c, from, end, { bodies: ["Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] })
    .filter(e => focus.points.includes(e.natal) || (e.natalHouse != null && focus.houses.includes(e.natalHouse)));
  const dated = events.flatMap(e => e.passes.flatMap(p => p.exact.map(x => ({ e, date: x.date, retro: x.retrograde }))))
    .sort((a, b) => b.e.weight - a.e.weight || a.date.localeCompare(b.date));
  const pick = dated[0];
  if (!pick) return null;
  return {
    date: pick.date,
    transit: `${pick.e.transiting}${pick.retro ? " (retrograde)" : ""} ${pick.e.aspect} your ${pick.e.natal}`,
    area: pick.e.houseTheme ?? pick.e.themes.join(", "),
    natalHouse: pick.e.natalHouse,
  };
}

export { natalTargets, HOUSE_THEMES, angDist };

const SIGNATURE_SIGN: Record<string, string> = {
  "Cardinal Fire": "Aries", "Fixed Earth": "Taurus", "Mutable Air": "Gemini", "Cardinal Water": "Cancer",
  "Fixed Fire": "Leo", "Mutable Earth": "Virgo", "Cardinal Air": "Libra", "Fixed Water": "Scorpio",
  "Mutable Fire": "Sagittarius", "Cardinal Earth": "Capricorn", "Fixed Air": "Aquarius", "Mutable Water": "Pisces",
};

/** Chart Signature: the strongest element + modality (Sun, Moon and Ascendant count double).
 *  Returns null when either one is tied, because then there's no clear signature. */
export function chartSignature(c: NatalChart, uncertain: string[] = []) {
  const weight = (n: string) => (uncertain.includes(n) ? 0 : n === "Sun" || n === "Moon" || n === "Ascendant" ? 2 : 1);
  const top = (groups: Record<string, string[]>) => {
    const scored = Object.entries(groups).map(([k, names]) => ({ k, score: names.reduce((s, n) => s + weight(n), 0) }))
      .sort((a, b) => b.score - a.score);
    return scored.length && (scored.length === 1 || scored[0].score > scored[1].score) ? scored[0] : null;
  };
  const el = top(c.elements), mo = top(c.modalities);
  if (!el || !mo) return null;
  const name = `${mo.k} ${el.k}`;
  return { element: el.k, modality: mo.k, name, sign: SIGNATURE_SIGN[name] };
}

/** One plain-English takeaway per planet, used when the written interpretation isn't available */
export const PLANET_TAKEAWAY: Record<string, string> = {
  Mercury: "Your mind is your engine. Trust your curiosity and say what you notice; your words open more doors than you think.",
  Venus: "What you love shapes your path. Follow beauty, pleasure and real connection, and let yourself receive as easily as you give.",
  Mars: "You're built to act. Pick one goal worth fighting for and put your energy there instead of everywhere at once.",
  Jupiter: "You grow by saying yes. Stay open to teachers, travel and big ideas, and keep an eye on doing too much at once.",
  Saturn: "Your power comes from patience. What you build slowly and on purpose is what lasts; the effort is the point.",
  Uranus: "You're here to do it differently. Your restlessness is a signal to change something, not to apologize for.",
  Neptune: "You feel more than most. Give your imagination somewhere to go, like art, music or quiet, and protect your energy.",
  Pluto: "You're made for depth and reinvention. When something ends in your life, it's usually making room for something truer.",
};
