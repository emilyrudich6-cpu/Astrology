// The Synastry Reading: house overlays both ways, aspects ranked by orb with a
// one-word tag, shared natal retrogrades and the next key dates for both people.
import { DateTime } from "luxon";
import { natalChart, BirthData, NatalChart } from "./engine/natal";
import { fmtDeg, houseOf, signOf, angDist, norm360 } from "./engine/core";
import { synastry, timelinesTogether, skyEvents, natalTargets } from "./engine/transits";
import { progressedStations, upcomingRetrogrades, fmtOrb, ordinal } from "./engine/extras";
import { writeJSON, str, strArr, obj, arr } from "./ai-json";
import { BRAND } from "./config";

const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const pr = (s: string) => s.replace(/'/g, "′");
const fmtDay = (iso: string | Date) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const OUTER = ["Uranus", "Neptune", "Pluto"];
const PERSONAL = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Ascendant"];
const ASP: Record<string, string> = { conjunction: "conjunct", opposition: "opposite", square: "square", trine: "trine", sextile: "sextile", quincunx: "quincunx" };
const label = (n: string) => (n === "Ascendant" ? "Rising" : n);

export const TAGS = ["SWEET", "HEAT", "GLUE", "INTENSE", "ELECTRIC", "FOGGY", "FRICTION"] as const;

export const SUBTITLE: Record<string, string> = {
  partner: "a love synastry: whose planets land in whose houses",
  crush: "a love synastry: whose planets land in whose houses",
  ex: "a synastry of what you shared: whose planets land in whose houses",
  friend: "a friendship synastry: whose planets land in whose houses",
  family: "a family synastry: whose planets land in whose houses",
  "business partner": "a business synastry: whose planets land in whose houses",
  coworker: "a working synastry: whose planets land in whose houses",
};

function bornLine(b: BirthData) {
  const day = DateTime.fromISO(b.date).toFormat("LLL d, yyyy");
  if (!b.time) return `${day} · time unknown${b.place ? ` · ${b.place.split(",")[0]}` : ""}`;
  const t = DateTime.fromISO(`${b.date}T${b.time}`, { zone: b.timezone }).toFormat("h:mm a");
  return `${day} · ${t}${b.place ? ` · ${b.place.split(",")[0]}` : ""}`;
}

function profile(c: NatalChart, b: BirthData) {
  const P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const at = (n: string) => pr(`${P[n].position}${P[n].house ? ` (${ordinal(P[n].house)}${n === "Sun" || n === "Moon" ? " house" : ""})` : ""}`);
  const retro = c.planets.filter(p => p.retrograde).map(p => p.name);
  return {
    name: c.name, born: bornLine(b),
    sun: at("Sun"), moon: at("Moon"),
    rising: c.angles ? pr(c.angles[0].position) : "unknown (no birth time)",
    venus: at("Venus"), mars: at("Mars"),
    bornWith: retro.length ? `${listJoin(retro)} retrograde` : "No planets retrograde",
  };
}
const listJoin = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

function overlay(from: NatalChart, into: NatalChart, prefix: string) {
  if (!into.houseCusps) return null;
  const cusps = into.houseCusps.map(h => h.lon);
  const pts = [
    ...from.planets.map(p => ({ name: p.name as string, lon: p.lon })),
    { name: "North Node", lon: from.points[0].lon },
    ...(from.angles ? [{ name: "Rising", lon: from.angles[0].lon }] : []),
  ];
  return pts.map((p, i) => ({ id: `${prefix}${i + 1}`, planet: p.name, where: `${signOf(p.lon)} · ${into.name}'s ${ordinal(houseOf(p.lon, cusps))}` }));
}

export function synastryCalc(me: BirthData, them: BirthData, relationship: string, now: Date) {
  const a = natalChart(me), b = natalChart(them);
  const syn = synastry(a, b);
  const aspects = syn.aspects
    .map(x => ({ pa: x[a.name] as string, pb: x[b.name] as string, aspect: x.aspect, orb: x.orb, major: x.major }))
    .filter(x => x.major && x.orb <= 4.5)
    // Keep contacts that involve someone's personal planets or Rising; outer-planet and Node/MC-only links only when nearly exact
    .filter(x => PERSONAL.includes(x.pa) || PERSONAL.includes(x.pb) || x.orb <= 1)
    .filter(x => !(OUTER.includes(x.pa) && OUTER.includes(x.pb)) || x.orb <= 1)
    .filter(x => !(x.pa === "Midheaven" || x.pb === "Midheaven") || x.orb <= 1)
    .slice(0, 16)
    .map((x, i) => ({
      id: `s${i + 1}`,
      aspect: x.pa === x.pb && ["Moon", "Ascendant", "Sun", "Venus", "Mars"].includes(x.pa)
        ? `${label(x.pa)} ${ASP[x.aspect]} ${label(x.pb)}`
        : `${a.name}'s ${label(x.pa)} ${ASP[x.aspect]} ${b.name}'s ${label(x.pb)}`,
      orb: fmtOrb(x.orb),
    }));

  // Natal retrogrades and when they turn by progression
  const retroOf = (c: NatalChart) => progressedStations(c).filter(s => s.retrogradeAtBirth && s.turns === "direct" && ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(s.planet))
    .map(s => ({ planet: s.planet, natal: pr(s.natal), turnsDirectAge: Math.floor(s.age), turnsDirectYear: s.date.slice(0, 4) }));

  // Key dates over the next 13 months
  const end = addDays(now, 395);
  const ta = natalTargets(a), tb = natalTargets(b);
  const near = (lon: number, ts: { name: string; lon: number }[], orb = 2.5) =>
    ts.filter(t => angDist(t.lon, lon) <= orb).map(t => `${t.name} (${fmtOrb(angDist(t.lon, lon))})`);
  const candidates: { id: string; date: string; sort: string; sky: string; touches: Record<string, string[]> }[] = [];
  const skyA = skyEvents(a, now, end);
  for (const s of skyA.stations.filter(s => ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"].includes(s.planet))) {
    const lon = parseLon(s.position);
    const hitA = near(lon, ta), hitB = near(lon, tb);
    if (hitA.length || hitB.length)
      candidates.push({ id: "", date: fmtDay(s.date), sort: s.date, sky: pr(`${s.planet} ${s.station} at ${s.position}`), touches: { [a.name]: hitA, [b.name]: hitB } });
  }
  const retros = upcomingRetrogrades(a, now, 13).filter(r => ["Mercury", "Venus", "Mars"].includes(r.planet));
  for (const r of retros) {
    const from = parseLon(r.from), to = parseLon(r.to), span = norm360(from - to);
    const crossed = (ts: { name: string; lon: number }[]) => ts.filter(t => norm360(from - t.lon) <= span + 0.5).map(t => t.name);
    candidates.push({
      id: "", date: fmtRange(r.start, r.end, now), sort: r.start < now.toISOString() ? now.toISOString() : r.start,
      sky: pr(`${r.planet} retrograde, ${r.from} → ${r.to}`), touches: { [a.name]: crossed(ta), [b.name]: crossed(tb) },
    });
  }
  for (const l of skyA.lunations.filter(l => l.eclipse)) {
    const lon = parseLon(l.position);
    const hitA = near(lon, ta, 3), hitB = near(lon, tb, 3);
    if (hitA.length || hitB.length)
      candidates.push({ id: "", date: fmtDay(l.date), sort: l.date, sky: pr(`${cap(l.eclipse!)} at ${l.position}`), touches: { [a.name]: hitA, [b.name]: hitB } });
  }
  const together = timelinesTogether(a, b, now, end);
  for (const t of together.bondTriggers.sort((x, y) => y.weight - x.weight).slice(0, 6))
    candidates.push({ id: "", date: fmtDay(t.date), sort: t.date, sky: t.transit, touches: { activates: [t.activates] } });
  // Merge triggers that are the same sky event, and drop events that touch neither chart
  const merged: typeof candidates = [];
  for (const c of candidates) {
    const same = merged.find(m => m.date === c.date && m.sky === c.sky);
    if (same) same.touches.activates = [...(same.touches.activates ?? []), ...(c.touches.activates ?? [])];
    else if (Object.values(c.touches).some(v => v.length)) merged.push(c);
  }
  candidates.length = 0; candidates.push(...merged);
  candidates.sort((x, y) => x.sort.localeCompare(y.sort)).forEach((c, i) => (c.id = `k${i + 1}`));

  return {
    charts: { a, b },
    header: {
      relationship, subtitle: SUBTITLE[relationship] ?? SUBTITLE.partner,
      a: profile(a, me), b: profile(b, them),
      note: [a, b].filter(c => !c.birth.timeKnown).map(c => `${c.name}'s birth time is unknown, so ${c.name}'s Rising and houses are left out and the Moon may be a few degrees off.`)
        .concat(b.birth.timeKnown ? [`${b.name}'s Rising and house cusps depend on the ${bornLine(them).split(" · ")[1]} birth time; a few minutes either way could shift placements near a cusp.`] : []),
      prepared: fmtDay(now),
    },
    wheels: [a, b].map(c => ({
      planets: c.planets.map(p => ({ name: p.name, lon: p.lon, retrograde: p.retrograde })),
      cusps: c.houseCusps?.map(h => h.lon) ?? null, asc: c.angles?.[0].lon ?? null,
    })),
    aInB: overlay(a, b, "x"), bInA: overlay(b, a, "y"),
    aspects,
    retro: { [a.name]: retroOf(a), [b.name]: retroOf(b) },
    keyDates: candidates.map(({ sort, ...c }) => c),
  };
}
function fmtRange(a: string, b: string, now?: Date) {
  const A1 = new Date(a), B1 = new Date(b);
  if (now && A1 < now) return `Now – ${fmtDay(B1)}`;
  const same = A1.getUTCFullYear() === B1.getUTCFullYear();
  return `${A1.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(same ? {} : { year: "numeric" }), timeZone: "UTC" })} – ${fmtDay(B1)}`;
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
function parseLon(pos: string) {
  const m = pos.match(/(\d+)°(\d+)'\s+(\w+)/);
  if (!m) return 0;
  const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"];
  return SIGNS.indexOf(m[3]) * 30 + Number(m[1]) + Number(m[2]) / 60;
}

const SYSTEM = `You write synastry readings for ${BRAND.name}, an astrology service. They are for entertainment and self-reflection.

DATA RULE: every position, house, aspect, orb and date must come from the JSON data. Never estimate a position, never invent a date, never add an aspect that isn't listed.

VOICE: warm, specific, honest and a little playful, like a friend who really knows astrology. Write about both people by name. Explain jargon in a few plain words. Plain text, no Markdown; **double asterisks** sparingly for a key phrase. Never mention software, data, JSON or AI. Be honest about friction without being alarming.

BOUNDARIES: you can't know the other person's feelings or choices; describe tendencies, never certainties. No medical, legal, financial or psychological advice. Never predict death, illness, pregnancy or disasters, and never promise outcomes. Rituals are simple and safe.`;

const overlayRow = { id: str("the row id"), meaning: str("what it means, 1-2 sentences"), feel: str("how it feels to the house owner, 2-4 words") };
const schema = obj({
  vibe: strArr("'The vibe in one breath': two paragraphs. The first sums up the strongest themes; the second names 'the cosmic catch', the main challenge"),
  top5: arr({ id: str("aspect row id"), line: str("one short line on why it matters") }, "The top 5 signatures for this relationship type, chosen from the aspect rows"),
  aInB: arr(overlayRow, "One entry per row of A's planets in B's houses (empty array if there are none)"),
  bInA: arr(overlayRow, "One entry per row of B's planets in A's houses (empty array if there are none)"),
  aspects: arr({ id: str("aspect row id"), tag: { type: "string", enum: [...TAGS] }, text: str("2 sentences") }, "One entry per aspect row"),
  retroTitle: str("a section title if either person was born with a planet retrograde (e.g. 'Both born with Mercury retrograde'), else empty string"),
  retroText: str("one or two paragraphs on the natal retrogrades and when they turn direct by progression, else empty string"),
  keyDates: arr({ id: str("candidate id"), forBoth: str("what it means for the two of them, 1-2 sentences") }, "The 3-5 most relevant upcoming dates, chosen from the candidates, in date order"),
  bottomLine: str("'The bottom line': one paragraph"),
  ritual: obj({ title: str("short ritual name with its date"), text: str("one paragraph tied to the earliest chosen key date") }),
});

export interface SynastryText {
  vibe: string[]; top5: { id: string; line: string }[];
  aInB: { id: string; meaning: string; feel: string }[]; bInA: { id: string; meaning: string; feel: string }[];
  aspects: { id: string; tag: string; text: string }[]; retroTitle: string; retroText: string;
  keyDates: { id: string; forBoth: string }[]; bottomLine: string; ritual: { title: string; text: string };
}
export interface SynastryDoc { v: "synastry1"; calc: Omit<ReturnType<typeof synastryCalc>, "charts">; text: SynastryText }

export async function synastryDocReading(me: BirthData, them: BirthData, relationship: string, now = new Date()) {
  const calc = synastryCalc(me, them, relationship, now);
  const { charts, ...shown } = calc;
  const { a, b } = charts;
  const brief = (c: NatalChart) => ({ bigThree: c.bigThree, planets: c.planets.map(p => ({ name: p.name, position: p.position, house: p.house, retrograde: p.retrograde })), angles: c.angles?.map(x => ({ name: x.name, position: x.position })), warnings: c.warnings });
  const text = await writeJSON<SynastryText>(SYSTEM,
    `Write the synastry reading for ${a.name} (the member) and ${b.name}. Relationship: ${relationship}. "aInB" rows are ${a.name}'s planets in ${b.name}'s houses ('feel' is how it feels to ${b.name}); "bInA" rows are ${b.name}'s planets in ${a.name}'s houses ('feel' is how it feels to ${a.name}). Today is ${shown.header.prepared}.`,
    { relationship, [a.name]: brief(a), [b.name]: brief(b), aInB: shown.aInB, bInA: shown.bInA, aspectRows: shown.aspects,
      natalRetrogrades: shown.retro, keyDateCandidates: shown.keyDates },
    schema, 9000,
    { aInB: shown.aInB?.map(r => r.id) ?? [], bInA: shown.bInA?.map(r => r.id) ?? [], aspects: shown.aspects.map(r => r.id),
      top5: shown.aspects.slice(0, 5).map(r => r.id), keyDates: shown.keyDates.slice(0, 4).map(k => k.id) });
  const doc: SynastryDoc = { v: "synastry1", calc: shown, text };
  return { kind: "synastry" as const, title: `${a.name} + ${b.name}`, body: JSON.stringify(doc) };
}
