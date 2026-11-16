// Your Month Ahead: three dates or windows in the next 30 days, from the member's own transits.
// Everything here is calculated (the same engine as the timeline readings); nothing is written by AI.
import { natalChart, BirthData } from "./engine/natal";
import { transitTimeline, POINT_THEMES } from "./engine/transits";

const PLANET: Record<string, string> = {
  Sun: "confidence and being seen", Mercury: "conversations and decisions", Venus: "love, money and what you value",
  Mars: "drive and action", Jupiter: "growth and opportunity", Saturn: "responsibility and commitment",
  Uranus: "sudden change", Neptune: "dreams and intuition", Pluto: "power and letting go",
};
const VERB: Record<string, string> = {
  conjunction: "meets", opposition: "sits opposite", square: "presses on", trine: "flows with", sextile: "opens a door to",
};
const TONE: Record<string, string> = {
  conjunction: "A fresh start here: what you begin now tends to stick.",
  opposition: "Expect this to come through another person. Notice what they show you.",
  square: "Friction with a purpose. Act on it instead of waiting it out.",
  trine: "This one comes easily, so use it on purpose.",
  sextile: "A small opening. It only counts if you take it.",
};
const ASK: Record<string, string> = {
  Sun: "What part of you wants to be seen this month?", Mercury: "Which conversation have you been putting off?",
  Venus: "What do you want more of, and have you asked for it?", Mars: "What are you ready to act on?",
  Jupiter: "Where are you being invited to think bigger?", Saturn: "What are you ready to take responsibility for?",
  Uranus: "What needs to change, even if it's uncomfortable?", Neptune: "What is your intuition telling you that you haven't acted on?",
  Pluto: "What are you ready to let go of?",
};

export interface MonthAhead { items: { when: string; title: string; text: string }[]; question: string }

const day = (iso: string) => new Date(iso.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });

export function monthAhead(b: BirthData, now = new Date()): MonthAhead | null {
  try {
    const c = natalChart(b);
    const from = now.toISOString().slice(0, 10), to = new Date(now.getTime() + 30 * 864e5).toISOString().slice(0, 10);
    const picks = transitTimeline(c, now, new Date(now.getTime() + 30 * 864e5))
      .map(e => {
        const exact = e.passes.flatMap(p => p.exact.map(x => x.date.slice(0, 10))).filter(d => d >= from && d <= to).sort();
        const pass = e.passes.find(p => p.end >= from && p.start <= to);
        return { e, exact, pass };
      })
      .filter(x => x.pass && (x.exact.length || x.e.weight >= 4))
      // exact dates this month first, then the heavier transits
      .sort((a, b) => (b.exact.length ? 1 : 0) - (a.exact.length ? 1 : 0) || b.e.weight - a.e.weight);
    // No more than one per transiting planet, so the three dates aren't the same story three times
    const seen = new Set<string>(); const three = [];
    for (const x of picks) { if (seen.has(x.e.transiting)) continue; seen.add(x.e.transiting); three.push(x); if (three.length === 3) break; }
    if (!three.length) return null;
    three.sort((a, b) => (a.exact[0] ?? a.pass!.start).localeCompare(b.exact[0] ?? b.pass!.start));
    const items = three.map(({ e, exact, pass }) => {
      const s = pass!.start < from ? from : pass!.start, en = pass!.end > to ? to : pass!.end;
      const themes = POINT_THEMES[e.natal]?.slice(0, 2).join(" and ");
      return {
        when: exact.length ? day(exact[0]) : `${day(s)} to ${day(en)}`,
        title: `${["Sun", "Moon"].includes(e.transiting) ? "The " : ""}${e.transiting} ${VERB[e.aspect] ?? e.aspect} your ${e.natal}`,
        text: `${["Sun", "Moon"].includes(e.transiting) ? "The " : ""}${e.transiting} is about ${PLANET[e.transiting] ?? "change"}; your ${e.natal} is about ${themes || "a personal part of your chart"}. ${TONE[e.aspect] ?? ""}`.trim(),
      };
    });
    const lead = [...three].sort((a, b) => b.e.weight - a.e.weight)[0].e.transiting;
    return { items, question: ASK[lead] ?? "What do you want this month to be about?" };
  } catch { return null; }
}
