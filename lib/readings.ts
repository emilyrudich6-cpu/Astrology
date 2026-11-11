// Turns calculated chart data into written readings, following Emily's method.
import Anthropic from "@anthropic-ai/sdk";
import { natalChart, BirthData, NatalChart } from "./engine/natal";
import { timing, synastry, timelinesTogether, CATEGORY_FOCUS, transitTimeline, groupTimeline } from "./engine/transits";
import { ANTHROPIC_MODEL, BRAND, QUESTION_MENU } from "./config";

export const METHOD = `METHOD, in this order (use only the sections the task asks for):
1. Big three and chart ruler: Sun, Moon, Ascendant, and the ruler of the Ascendant sign with its house and condition.
2. Angles: Ascendant, Midheaven, Descendant, IC, and planets within 8° of them.
3. Each planet: sign, Placidus house (note whole-sign if different), degree, speed (fast/average/slow/stationary), retrograde, declination and out-of-bounds.
4. Aspects: major and minor, tightest first, applying or separating; name patterns (stelliums, T-squares, grand trines, yods).
5. Chart shape, element and modality balance, hemisphere emphasis, Moon phase at birth.
6. Points: lunar nodes, Black Moon Lilith, Part of Fortune.
7. Harmonics: 5th (creative talent), 7th (inspiration/spirituality), 9th (joy/fulfilment).
8. Timing: today's transits, then the exact transit peak dates grouped into themes and windows.
9. If two people: synastry aspects (tightest first), house overlays both ways, and how their timelines interact over the next year, with projections.
10. Close with a summary of themes and a manifestation ritual tied to the next key date.`;

const SYSTEM = `You write astrology readings for ${BRAND.name}, a subscription astrology service. Readings are for entertainment and self-reflection.

DATA RULE: Every position, house, aspect, orb, speed and date you mention must come from the JSON chart data in the message. It was calculated with an astronomical library and checked against Swiss Ephemeris. Never estimate or recall a planet position, never invent a date, and never add aspects that aren't listed. If something isn't in the data (for example houses when the birth time is unknown), say plainly that it can't be read without it.

${METHOD}

STYLE
- Write to the member as "you", warm, direct and a little bold, like a sharp friend who really knows astrology. Explain jargon in a few plain words the first time it comes up.
- Interpret, don't just list. Every placement should answer "so what does this mean for me?"
- Use Markdown: a short title (#), section headings (##), short paragraphs, bold for key dates. Give dates as "March 19, 2027". Mark retrograde passes.
- Don't mention software, calculations, data, JSON, AI or what produced the reading, and don't claim a person hand-wrote it. Say "your chart shows", not "the data shows".

BOUNDARIES
- No medical, legal, financial or psychological advice; for money topics talk about energy, timing and mindset, never specific investments. Never predict death, illness, pregnancy, accidents or disasters, and never promise outcomes.
- When a question is about another person's feelings or choices, read it through the member's own chart and timing and say so.
- Manifestation rituals are simple and safe: journaling, intention-setting, a walk, a candle you never leave unattended, and so on.
- End with one italic line: "${BRAND.disclaimer}"`;

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

async function write(task: string, data: unknown, maxTokens = 9000): Promise<string> {
  if (process.env.READINGS_DRY_RUN) return `DRY RUN | prompt chars: ${task.length} | data chars: ${JSON.stringify(data).length}`;
  const msg = await client().messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system: SYSTEM,
    messages: [{ role: "user", content: `${task}\n\nCHART DATA (JSON):\n${JSON.stringify(data)}` }],
  });
  return msg.content.map(b => (b.type === "text" ? b.text : "")).join("").trim();
}

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
const fmtDay = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Natal chart without bulky fields the writer doesn't need */
function slimNatal(c: NatalChart) {
  const { houseCusps, ...rest } = c;
  return { ...rest, houseCusps: houseCusps?.map(h => `${h.house}: ${h.position}`) ?? null };
}

// ---------- Reading types ----------

/** FREE: natal deep dive (steps 1-7, a taste of 8, and 10) */
export async function natalReading(b: BirthData, now = new Date()) {
  const c = natalChart(b);
  const yearAhead = groupTimeline(transitTimeline(c, now, addDays(now, 365), { bodies: ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] }));
  const data = {
    today: fmtDay(now),
    natal: slimNatal(c),
    nextKeyWindows: yearAhead.keyWindows.slice(0, 3),
  };
  const title = `${c.name}'s Natal Chart Deep Dive`;
  const body = await write(
    `Write ${c.name}'s natal chart deep dive. Cover steps 1 to 7 of the method in order, thoroughly. ` +
    `Then a short step 8: name the 3 key windows in "nextKeyWindows" with their exact dates as a teaser, and mention that the monthly timeline maps every date. ` +
    `Finish with step 10, tying the ritual to the earliest of those dates. Title: "${title}".`,
    data,
  );
  return { kind: "natal" as const, title, body, chart: c };
}

/** TIMELINE tier: the next 30 days (step 8 + 10), in the context of the year */
export async function monthlyTimeline(b: BirthData, now = new Date()) {
  const c = natalChart(b);
  const end = addDays(now, 30);
  const month = timing(c, now, end, { bodies: ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] });
  const year = groupTimeline(transitTimeline(c, now, addDays(now, 365), { bodies: ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] }));
  const title = `Your Timeline: ${fmtDay(now)} to ${fmtDay(end)}`;
  const body = await write(
    `Write ${c.name}'s personal timeline for ${fmtDay(now)} to ${fmtDay(end)}. Follow step 8: open with today's transits ` +
    `(month.today), then the exact transit peak dates in this period grouped into themes and windows ` +
    `(month.grouped and month.exactTransits), plus new and full moons, eclipses, stations and ingresses that touch the chart (month.sky). ` +
    `Lead with the heaviest transits (highest weight). Briefly place the month inside the bigger year (yearContext.keyWindows). ` +
    `Finish with step 10: a summary of the month's themes and a ritual tied to the next key date. Title: "${title}".`,
    { natalSummary: { bigThree: c.bigThree, chartRuler: c.chartRuler, planets: c.planets, angles: c.angles, warnings: c.warnings },
      month, yearContext: { keyWindows: year.keyWindows.slice(0, 8) } },
  );
  return { kind: "timeline" as const, title, body };
}

/** DEEP tier: answer one menu question */
export async function questionAnswer(b: BirthData, categoryKey: string, question: string, now = new Date()) {
  const c = natalChart(b);
  const focus = CATEGORY_FOCUS[categoryKey] ?? { points: [], houses: [] };
  const category = QUESTION_MENU.find(q => q.key === categoryKey)?.label ?? categoryKey;
  const t = timing(c, now, addDays(now, 365), { bodies: ["Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] });
  const relevant = (natal: string, house: number | null) =>
    focus.points.includes(natal) || (house != null && focus.houses.includes(house));
  const data = {
    today: fmtDay(now), category, question,
    focus: { points: focus.points, houses: focus.houses },
    natal: slimNatal(c),
    today_transits: t.today,
    relevantTransits: t.exactTransits.filter(e => relevant(e.natal, e.natalHouse)),
    otherMajorWindows: t.grouped.keyWindows.slice(0, 6),
    lunationsInFocusHouses: t.sky.lunations.filter(l => l.natalHouse && focus.houses.includes(l.natalHouse)),
    stationsAndIngresses: { stations: t.sky.stations.filter(s => s.onNatalPoints.length), ingresses: t.sky.ingresses },
  };
  const title = question;
  const body = await write(
    `${c.name} asked a question from the "${category}" menu: "${question}". Answer it directly in the first paragraph, then back it up. ` +
    `Use the natal factors tied to this area (focus points and houses; their signs, houses, aspects, rulers of the focus houses) ` +
    `and the timing over the next 12 months (relevantTransits, lunationsInFocusHouses, stations), giving the exact peak dates and the windows. ` +
    `Keep it focused on this question: about 600 to 900 words. Finish with step 10: a summary and a ritual tied to the next key date for this question. Title: "${title}".`,
    data, 6000,
  );
  return { kind: "question" as const, title, body };
}

/** DEEP tier: compatibility with a saved person (step 9 + 10) */
export async function synastryReading(member: BirthData, other: BirthData, relationship: string, now = new Date()) {
  const a = natalChart(member), b = natalChart(other);
  const data = {
    today: fmtDay(now), relationship,
    [a.name]: { bigThree: a.bigThree, planets: a.planets, angles: a.angles, warnings: a.warnings },
    [b.name]: { bigThree: b.bigThree, planets: b.planets, angles: b.angles, warnings: b.warnings },
    synastry: synastry(a, b),
    timelinesTogether: timelinesTogether(a, b, now, addDays(now, 365)),
  };
  const title = `${a.name} & ${b.name}`;
  const body = await write(
    `Write a compatibility reading for ${a.name} (the member) and ${b.name} (relationship: ${relationship}). Follow step 9: ` +
    `synastry aspects tightest first (focus on the strongest 10 to 15), house overlays both ways, and how their timelines interact over the next year ` +
    `(sharedTransits, bondTriggers, busiestMonthsForBoth) with projections and exact dates. Then step 10. Title: "${title}".`,
    data,
  );
  return { kind: "synastry" as const, title, body };
}
