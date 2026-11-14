// Phase 2: put a journal entry next to the member's own transits on the day the number was seen.
// Everything here is calculated: the themes come from words in the member's own note, and the
// transits come from the same timeline engine as their readings. Overlaps are framed as questions.
import { natalChart, BirthData, NatalChart } from "./engine/natal";
import { currentTransits, transitTimeline, POINT_THEMES } from "./engine/transits";
import { Planet } from "./engine/core";
import { interpretNumber, GENERAL_QUESTION, NumberMeaning } from "./seeing-numbers";

export interface ThemeDef { key: string; label: string; words: RegExp; planets: string[]; question: string }
export const THEMES: ThemeDef[] = [
  { key: "conversation", label: "a conversation", planets: ["Mercury"], question: "What did you want to say, and what were you waiting for before saying it?",
    words: /\b(call(ed|ing)?|text(ed|ing)?|talk(ed|ing)?|say|said|tell|told|email(ed)?|messag(e|ed|ing)|conversation|speak|spoke|ask(ed)?|dm|reply|replied)\b/i },
  { key: "work", label: "work", planets: ["Saturn", "Sun", "Midheaven", "Mars"], question: "What would you do about this at work if you trusted you'd already earned it?",
    words: /\b(work|job|boss|career|interview|office|client|meeting|promotion|cowork(er|ers)|manager|shift|business|hired|fired|quit|stream|brand)\b/i },
  { key: "decision", label: "a decision", planets: ["Mercury", "Saturn", "Jupiter"], question: "If you already knew the answer, what would it be?",
    words: /\b(decid(e|ed|ing)|decision|choose|choosing|choice|debating|whether|unsure|should i)\b/i },
  { key: "love", label: "love", planets: ["Venus", "Mars", "Moon"], question: "What were you hoping to feel from them in that moment?",
    words: /\b(love|date|dating|crush|partner|boyfriend|girlfriend|husband|wife|ex|kiss(ed)?|relationship|situationship)\b/i },
  { key: "family", label: "family", planets: ["Moon"], question: "What did you need from home or family right then?",
    words: /\b(mom|dad|mother|father|sister|brother|family|home|kids?|son|daughter|grandma|grandpa|parents?)\b/i },
  { key: "money", label: "money", planets: ["Venus", "Jupiter", "Saturn"], question: "What would feeling secure with money look like for you right now?",
    words: /\b(money|pay|paid|rent|bills?|salary|raise|price|buy|bought|invest(ed|ing)?|bank|debt|income|sale|sold)\b/i },
  { key: "travel", label: "travel or a move", planets: ["Jupiter", "Mercury"], question: "Where were you hoping this would take you?",
    words: /\b(trip|travel(ing|ling)?|flight|airport|vacation|moving|move)\b/i },
  { key: "creative", label: "a creative project", planets: ["Venus", "Neptune", "Sun"], question: "What wants to be made, and what's in the way?",
    words: /\b(art|paint(ing)?|writ(e|ing)|music|song|creat(e|ing)|design|film|video|podcast|shoot)\b/i },
];

export const themesIn = (note: string | null) => (note ? THEMES.filter(t => t.words.test(note)) : []);

const PLANET_WORDS: Record<string, string> = {
  Sun: "identity and confidence", Mercury: "communication and decisions", Venus: "love, money and what you value",
  Mars: "drive and action", Jupiter: "growth and opportunity", Saturn: "responsibility and commitment",
  Uranus: "sudden change", Neptune: "dreams and intuition", Pluto: "power and transformation",
};
const PLANET_QUESTION: Record<string, string> = {
  Sun: "What part of yourself wanted to be seen that day?", Mercury: "What conversation or decision was on your mind that day?",
  Venus: "What were you wanting more of that day?", Mars: "What were you ready to act on?", Jupiter: "Where did you feel pulled to grow?",
  Saturn: "What were you being asked to take responsibility for?", Uranus: "What felt like it needed to change?",
  Neptune: "What were you dreaming about, or unsure of?", Pluto: "What were you ready to transform or let go of?",
};
const ASPECT_VERB: Record<string, string> = {
  conjunction: "meeting", opposition: "opposite", square: "pressing on", trine: "flowing with", sextile: "opening a door to", quincunx: "asking for an adjustment with",
};

export interface TransitOnDay {
  transiting: string; aspect: string; natal: string; orb: number; label: string; plain: string;
  from: string | null; to: string | null; exact: string[]; overlaps: string[];
}
export interface Comparison {
  meaning: NumberMeaning | null; numberQuestion: string; themes: { key: string; label: string }[];
  transits: TransitOnDay[]; overlap: { theme: string; planet: string; transit: string } | null; question: string; chartMissing: boolean;
}

const fmt = (iso: string) => new Date(iso.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** One or two transits active at the moment the number was seen, preferring ones that match the note */
export function transitsOn(c: NatalChart, seenAt: Date, themes: ThemeDef[]): TransitOnDay[] {
  const all = currentTransits(c, seenAt).aspectsToNatal.filter((a: any) => a.transiting !== "Moon");
  const scored = all.map((a: any) => {
    const overlaps = themes.filter(t => t.planets.includes(a.transiting) || t.planets.includes(a.natal)).map(t => t.key);
    return { a, overlaps, score: a.weight + (overlaps.length ? 6 : 0) - a.orb * 0.5 };
  }).sort((x, y) => y.score - x.score);
  const pick = scored.slice(0, 2).filter((s, i) => i === 0 || s.overlaps.length || s.a.weight >= 3);
  return pick.map(({ a, overlaps }) => {
    // Find the window this transit is in effect, from the same engine as the timeline readings
    let from: string | null = null, to: string | null = null, exact: string[] = [];
    try {
      const span = ["Sun", "Mercury", "Venus", "Mars"].includes(a.transiting) ? 40 : 300;
      const ev = transitTimeline(c, new Date(seenAt.getTime() - span * 864e5), new Date(seenAt.getTime() + span * 864e5),
        { bodies: [a.transiting as Planet], aspects: [a.aspect] }).find(e => e.natal === a.natal);
      const day = seenAt.toISOString().slice(0, 10);
      const pass = ev?.passes.find(p => p.start <= day && day <= p.end) ?? ev?.passes[0];
      if (ev && pass) { from = ev.passes[0].start; to = ev.passes[ev.passes.length - 1].end; exact = ev.passes.flatMap(p => p.exact.map(x => x.date.slice(0, 10))); }
    } catch { /* window unavailable: the transit itself still shows */ }
    const themesOfNatal = POINT_THEMES[a.natal]?.slice(0, 2).join(" and ") ?? "";
    return {
      transiting: a.transiting, aspect: a.aspect, natal: a.natal, orb: a.orb,
      label: `${a.transiting} ${a.aspect} your natal ${a.natal}`,
      plain: `${a.transiting} (${PLANET_WORDS[a.transiting]}) was ${ASPECT_VERB[a.aspect] ?? a.aspect} your ${a.natal}${themesOfNatal ? ` (${themesOfNatal})` : ""}.`,
      from: from ? fmt(from) : null, to: to ? fmt(to) : null, exact: exact.map(fmt), overlaps,
    };
  });
}

export function compareEntry(entry: { number_norm: string; note: string | null; seen_at: string }, birth: BirthData | null): Comparison {
  const meaning = interpretNumber(entry.number_norm);
  const themes = themesIn(entry.note);
  let transits: TransitOnDay[] = [], chartMissing = false;
  if (birth) { try { transits = transitsOn(natalChart(birth), new Date(entry.seen_at), themes); } catch { chartMissing = true; } }
  else chartMissing = true;
  const hit = transits.find(t => t.overlaps.length);
  const overlap = hit ? { theme: hit.overlaps[0], planet: hit.transiting, transit: hit.label } : null;
  // The question comes from the member's own note first, then the sky, then the number
  const question = overlap ? THEMES.find(t => t.key === overlap.theme)!.question
    : themes[0] ? themes[0].question
    : transits[0] ? PLANET_QUESTION[transits[0].transiting] ?? GENERAL_QUESTION
    : meaning?.question ?? GENERAL_QUESTION;
  return {
    meaning, numberQuestion: meaning?.question ?? GENERAL_QUESTION,
    themes: themes.map(t => ({ key: t.key, label: t.label })), transits, overlap, question, chartMissing,
  };
}
