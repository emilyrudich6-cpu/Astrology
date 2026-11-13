// The Full Chart reading: every calculated table from the engine, plus the written
// sections from Claude, stored together as one JSON document.
import { DateTime } from "luxon";
import { natalChart, BirthData, NatalChart, round, RULER_MODERN, RULER_TRADITIONAL, ELEMENT, MODALITY } from "./engine/natal";
import { PLANETS, signOf, fmtDeg, houseOf, angDist, Sign } from "./engine/core";
import { transitTimeline, skyEvents, currentTransits, groupTimeline, HOUSE_THEMES } from "./engine/transits";
import { dominantPlanet } from "./engine/dominant";
import {
  fixedStars, birthEclipses, progressedStations, stationsNearBirth, upcomingRetrogrades, progressions,
  humanDesign, numerology, parallels, fmtOrb, ordinal,
} from "./engine/extras";
import { writeJSON, str, strArr, obj, arr } from "./ai-json";
import { BRAND } from "./config";

const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const fmtDay = (iso: string | Date) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const longDay = (iso: string | Date) => new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
const pr = (s: string) => s.replace(/'/g, "′");
/** "Oct 3 – Nov 14, 2026", or "Now – Nov 14, 2026" when it has already begun */
function fmtRange(a: string, b: string, now?: Date) {
  const A1 = new Date(a), B1 = new Date(b);
  if (now && A1 < now) return `Now – ${fmtDay(B1)}`;
  const same = A1.getUTCFullYear() === B1.getUTCFullYear();
  const left = A1.toLocaleDateString("en-US", { month: "short", day: "numeric", ...(same ? {} : { year: "numeric" }), timeZone: "UTC" });
  return `${left} – ${fmtDay(B1)}`;
}

export const HOUSE_NAMES: Record<number, string> = {
  1: "Self", 2: "Money & worth", 3: "Mind & voice", 4: "Home & roots", 5: "Joy, romance, creativity", 6: "Routine & health",
  7: "Partners", 8: "Intimacy & shared resources", 9: "Travel, beliefs, learning", 10: "Career & reputation",
  11: "Friends, networks, future", 12: "Spirit & the hidden",
};
const ASP_SHORT: Record<string, string> = {
  conjunction: "conj.", opposition: "opp.", square: "square", trine: "trine", sextile: "sextile", quincunx: "quincunx",
  semisextile: "semi-sextile", semisquare: "semi-square", sesquiquadrate: "sesquiquadrate", quintile: "quintile", biquintile: "bi-quintile",
};
const short = (n: string) => (n === "Ascendant" ? "ASC" : n === "Midheaven" ? "MC" : n);

// ---------------- Calculated part ----------------
export function fullChartCalc(b: BirthData, now: Date) {
  const c = natalChart(b);
  const cusps = c.houseCusps?.map(h => h.lon) ?? null;
  const P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const stars = fixedStars(c);
  const near = stationsNearBirth(c);
  const dom = dominantPlanet(c);
  const asc = c.angles?.find(a => a.name === "Ascendant");
  const mc = c.angles?.find(a => a.name === "Midheaven");

  // At a glance
  const stellium = c.patterns.find(p => p.pattern === "stellium" && p.detail?.startsWith("in ") && !p.detail.includes("house"));
  const stelliumSign = stellium?.detail?.replace("in ", "");
  const stelliumHouse = stellium && cusps ? (() => {
    const hs = stellium.planets.map(n => P[n]?.house).filter(Boolean) as number[];
    const top = hs.sort((a, b) => hs.filter(x => x === b).length - hs.filter(x => x === a).length)[0];
    return top ? `${ordinal(top)} house` : null;
  })() : null;
  const topOf = (g: Record<string, string[]>) => Object.entries(g).sort((a, b) => b[1].length - a[1].length);
  const els = topOf(c.elements), mods = topOf(c.modalities);
  const starOn = (on: string) => stars.find(s => s.on === on);
  const glance = [
    ...(asc ? [{ label: "Rising (Ascendant)", placement: pr(asc.position) }] : []),
    { label: "Sun", placement: pr(`${P.Sun.position}${P.Sun.house ? ` · ${ordinal(P.Sun.house)} house` : ""}`) },
    { label: "Moon", placement: pr(`${P.Moon.position}${P.Moon.house ? ` · ${ordinal(P.Moon.house)} house` : ""}`) },
    ...(mc ? [{ label: "Midheaven", placement: pr(mc.position) + (starOn("Midheaven") ? ` (on ${starOn("Midheaven")!.star})` : "") }] : []),
    ...(c.chartRuler ? [{ label: "Chart ruler", placement: [...c.chartRuler].reverse().map((r, i) => `${i ? "(+ " : ""}${r.planet} in ${signOf(P[r.planet].lon)}${i ? ")" : ""}`).join(" ") }] : []),
    ...(stellium ? [{ label: "Stellium", placement: `${stelliumSign}${stelliumHouse ? `, ${stelliumHouse}` : ""}` }] : []),
    { label: "Chart shape", placement: c.chartShape.shape },
    { label: "Moon phase", placement: `${c.moonPhase.phase} (${c.moonPhase.elongation}°)` },
    { label: "Strongest planets", placement: [dom.planet, ...dom.runnersUp.map(r => r.planet)].join(", ") },
    { label: "Element / mode", placement: `${els[0][0]}-heavy, ${mods[0][0]}-leaning` },
  ];

  // Planets table
  const condition = (name: string) => {
    const p = P[name];
    const parts: string[] = [];
    if (p) {
      if (p.dignity !== "peregrine") parts.push(p.dignity === "exaltation" ? "Exalted" : p.dignity[0].toUpperCase() + p.dignity.slice(1));
      if (p.retrograde) parts.push("Retrograde");
      const st = near.find(s => s.planet === name);
      if (st) parts.push(`${st.station[0].toUpperCase()}${st.station.slice(1)} ${Math.abs(st.daysFromBirth) < 1 ? "the day you were born" : `${Math.max(1, Math.round(Math.abs(st.daysFromBirth)))} day${Math.round(Math.abs(st.daysFromBirth)) > 1 ? "s" : ""} ${st.daysFromBirth < 0 ? "before" : "after"} birth`}`);
      if (p.outOfBounds) parts.push("Out of bounds");
    }
    const asp = c.aspects.filter(a => a.major && (a.a === name || a.b === name)).slice(0, 2)
      .map(a => `${ASP_SHORT[a.aspect]} ${short(a.a === name ? a.b : a.a)}`);
    const out = [...parts, ...asp].join("; ");
    return out ? out[0].toUpperCase() + out.slice(1) : "—";
  };
  const speedLabel = (p: typeof c.planets[number]) =>
    `${p.speed < 0 ? "−" : ""}${Math.abs(p.speed) < 0.01 ? Math.abs(p.speed).toFixed(4) : Math.abs(p.speed).toFixed(2)}°/day — ${p.retrograde ? (p.speedClass === "stationary" ? "stationary" : "retrograde") : p.speedClass}`;
  const pt = (n: string) => c.points.find(x => x.name === n);
  const planetRows = [
    ...c.planets.map(p => ({ body: p.name, position: pr(p.position), house: p.house ? String(p.house) : "—", speed: speedLabel(p), condition: condition(p.name) })),
    ...[["North Node", pt("North Node (true)"), `(mean ${pr(fmtDeg(pt("North Node (mean)")!.lon).split(" ")[0])})`],
      ["Black Moon Lilith", pt("Black Moon Lilith (mean)"), ""], ["Part of Fortune", pt("Part of Fortune"), ""]]
      .filter(([, p]) => p).map(([name, p, extra]: any) => ({
        body: name, position: pr(p.position) + (extra ? ` ${extra}` : ""), house: p.house ? String(p.house) : "—", speed: "—",
        condition: p.conjunctPlanets.length ? `Conj. ${p.conjunctPlanets.map((s: string) => s.split(" (")[0]).join(" & ")}` : "—",
      })),
  ];

  // Houses table
  const pointsIn = (h: number) => [
    ...c.planets.filter(p => p.house === h).map(p => p.name as string),
    ...c.points.filter(p => p.house === h && ["North Node (true)", "South Node (true)", "Black Moon Lilith (mean)", "Part of Fortune"].includes(p.name))
      .map(p => p.name.replace(" (true)", "").replace(" (mean)", "")),
  ];
  const houseRows = cusps ? c.houseCusps!.map(h => {
    const sign = signOf(h.lon) as Sign;
    const rulers = [...new Set([RULER_MODERN[sign], RULER_TRADITIONAL[sign]])];
    return {
      house: `${h.house} · ${HOUSE_NAMES[h.house]}`, cusp: pr(h.position),
      ruler: rulers.map(r => `${r} (${ordinal(P[r].house!)})`).join(", "),
      inside: pointsIn(h.house).join(", ") || "—",
    };
  }) : null;
  const wholeSignShifts = cusps ? c.planets.filter(p => p.houseDiffers).map(p => `${p.name}: Placidus ${p.house} → whole-sign ${p.wholeSignHouse}`) : [];

  // Aspects
  const aspectRows = c.aspects.filter(a => a.major).slice(0, 18).map((a, i) => ({
    id: `a${i + 1}`, aspect: `${short(a.a)} ${ASP_SHORT[a.aspect]} ${short(a.b)}`, orb: fmtOrb(a.orb),
    motion: a.motion === "applying" ? "A" : a.motion === "separating" ? "S" : "exact",
  }));
  const minorAspects = c.aspects.filter(a => !a.major && a.orb <= 1).slice(0, 10)
    .map(a => `${short(a.a)} ${a.aspect} ${short(a.b)} (${fmtOrb(a.orb)})`);

  // Retrogrades
  const natalRetros = progressedStations(c).filter(s => s.retrogradeAtBirth).map(s => ({
    planet: `${s.planet} Rx`, natal: pr(`${s.natal}${s.natalHouse ? ` (${ordinal(s.natalHouse)})` : ""}`),
    turnsDirect: `${new Date(s.date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })} — age ${Math.floor(s.age)}`,
  }));
  const retros = upcomingRetrogrades(c, now, 26).filter(r => ["Mercury", "Venus", "Mars", "Saturn"].includes(r.planet)).map((r, i) => ({
    id: `r${i + 1}`, retrograde: `${r.planet} Rx${r.underWay ? " (now)" : ""}`,
    dates: fmtRange(r.start, r.end), start: r.start, end: r.end,
    where: pr(`${r.from} → ${r.to}${r.houses ? `; ${r.houses.map(ordinal).join(" → ")}` : ""}`),
    _crosses: r.crossesNatal, _stations: r.stationsOn,
  }));

  // Progressions
  const prog = progressions(c, now);
  const progRows = [
    { id: "p1", point: "Progressed Sun", position: pr(`${prog.sun.position}${prog.sun.house ? ` · ${ordinal(prog.sun.house)} house` : ""}`) },
    { id: "p2", point: "Progressed Moon", position: pr(`${prog.moon.position}${prog.moon.house ? ` · ${ordinal(prog.moon.house)} house` : ""}`) },
    { id: "p3", point: "Progressed lunar phase", position: prog.lunarPhase.phase },
    { id: "p4", point: "Progressed Venus", position: pr(`${prog.venus.position}${prog.venus.house ? ` · ${ordinal(prog.venus.house)}` : ""}`) },
    { id: "p5", point: "Progressed Mars", position: pr(`${prog.mars.position}${prog.mars.house ? ` · ${ordinal(prog.mars.house)}` : ""}`) },
    ...(prog.solarArcMC ? [{ id: "p6", point: "Solar arc MC", position: pr(prog.solarArcMC.position) }] : []),
  ];
  const milestones = prog.milestones.slice(0, 7).map((m, i) => ({
    id: `m${i + 1}`, when: `~${new Date(m.date).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`, event: m.event,
  }));

  // Timeline: about 25 months
  const end = addDays(now, 25 * 30.44);
  const events = transitTimeline(c, now, end, { bodies: ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] });
  const sky = skyEvents(c, now, end);
  const grouped = groupTimeline(events);
  type Row = { date: string; sort: string; transit: string; weight: number };
  const rows: Row[] = [];
  for (const e of events.filter(e => e.weight >= 3.5)) {
    const exact = e.passes.flatMap(p => p.exact.map(x => x.date));
    const label = `${e.transiting} ${ASP_SHORT[e.aspect]} natal ${short(e.natal)}`;
    if (exact.length) {
      const also = exact.slice(1).map(d => fmtDay(d));
      rows.push({ date: fmtDay(exact[0]), sort: exact[0], transit: label + (also.length ? ` (also ${also.join(" & ")})` : ""), weight: e.weight });
    } else rows.push({ date: `Now – ${fmtDay(e.passes[0].end)}`, sort: now.toISOString(), transit: label, weight: e.weight * 0.8 });
  }
  const top = rows.sort((a, b) => b.weight - a.weight).slice(0, 24);
  for (const l of sky.lunations.filter(l => l.eclipse))
    top.push({ date: fmtDay(l.date), sort: l.date, transit: pr(`${l.eclipse[0].toUpperCase()}${l.eclipse.slice(1)} ${l.position}${l.natalHouse ? ` (${ordinal(l.natalHouse)})` : ""}${l.hitsNatal.length ? `, on natal ${l.hitsNatal.map(short).join(" & ")}` : ""}`), weight: 5 });
  for (const s of sky.stations.filter(s => ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(s.planet) && (s.onNatalPoints.length || s.planet === "Saturn")))
    top.push({ date: fmtDay(s.date), sort: s.date, transit: pr(`${s.planet} ${s.station} (${s.position}${s.natalHouse ? `, ${ordinal(s.natalHouse)}` : ""})`), weight: 4 });
  for (const r of retros.filter(r => r.retrograde.startsWith("Venus") || r.retrograde.startsWith("Mars")))
    top.push({ date: fmtRange(r.start, r.end, now), sort: r.start < now.toISOString() ? now.toISOString() : r.start, transit: `${r.retrograde.replace(" Rx", " retrograde").replace(" (now)", "")} (${r.where})`, weight: 4 });
  for (const m of prog.milestones.filter(m => new Date(m.date) <= end))
    top.push({ date: `~${fmtDay(m.date)}`, sort: m.date, transit: m.event, weight: 4 });
  const timelineRows = top.sort((a, b) => a.sort.localeCompare(b.sort)).map((r, i) => ({ id: `t${i + 1}`, date: r.date, transit: r.transit }));

  const today = currentTransits(c, now);
  const hd = humanDesign(c);
  const y = now.getUTCFullYear();
  const num = numerology(b.date, [y, y + 1, y + 2]);
  const ecl = birthEclipses(c);

  return {
    chart: c,
    header: {
      name: c.name,
      born: `${longDay(b.date + "T12:00:00Z")}${b.time ? ` · ${fmt12(b.time)} ${zoneAbbr(b)}` : " · time unknown"}${b.place ? ` · ${b.place}` : ""}`,
      bigThree: [asc ? `${signOf(asc.lon)} Rising` : null, `${P.Sun.sign} Sun`, `${P.Moon.sign} Moon`].filter(Boolean).join(" · "),
      sunSign: P.Sun.sign, prepared: longDay(now), timeKnown: c.birth.timeKnown, warnings: c.warnings,
      timelineSpan: `${new Date(now).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" })}`,
    },
    wheel: {
      planets: c.planets.map(p => ({ name: p.name, lon: p.lon, retrograde: p.retrograde })),
      cusps, asc: asc?.lon ?? null, aspects: c.aspects.filter(a => a.major).map(a => ({ a: a.a, b: a.b, aspect: a.aspect })),
    },
    glance, planetRows, houseRows, wholeSignShifts, aspectRows, minorAspects,
    natalRetros, stationsNearBirth: near, retros: retros.map(({ _crosses, _stations, start, end, ...r }) => r),
    stars: stars.map(s => ({ star: s.star, on: short(s.on), orb: s.orb, flavour: s.flavour })),
    elements: Object.fromEntries(els.map(([k, v]) => [k, v])), modalities: Object.fromEntries(mods.map(([k, v]) => [k, v])),
    progRows, progAsOf: { date: prog.asOf, age: Math.floor(prog.age) }, milestones,
    timelineRows, hd, numerology: num,
    // Context for the writer (not rendered as tables)
    _ctx: {
      eclipses: ecl, parallels: parallels(c), harmonics: c.harmonics, patterns: c.patterns, chartShape: c.chartShape,
      dominant: dom, retroDetail: retros, today: { date: longDay(now), moonPhase: today.moonPhase, sky: today.sky, aspects: today.aspectsToNatal.slice(0, 10) },
      lunationsSoon: sky.lunations.filter(l => new Date(l.date) <= addDays(now, 75)),
      keyWindows: grouped.keyWindows.slice(0, 12), ingresses: sky.ingresses.filter(i => i.enters.startsWith("your natal house")),
      progressions: prog, angles: c.angles, points: c.points, chartRuler: c.chartRuler, sect: c.sect,
      speeds: c.planets.map(p => ({ planet: p.name, speed: p.speed, speedClass: p.speedClass, retrograde: p.retrograde })),
      declinations: c.planets.map(p => ({ planet: p.name, declination: p.declination, outOfBounds: p.outOfBounds })),
      hemispheres: c.hemispheres,
    },
  };
}
export type FullChartCalc = ReturnType<typeof fullChartCalc>;

function zoneAbbr(b: BirthData) {
  const dt = DateTime.fromISO(`${b.date}T${b.time ?? "12:00"}`, { zone: b.timezone });
  const abbr = dt.toFormat("ZZZZ");
  return /^[A-Z]{2,5}$/.test(abbr) ? abbr : `UTC${dt.toFormat("ZZ")}`;
}
function fmt12(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// ---------------- Written part ----------------
const SYSTEM = `You write the Full Chart reading for ${BRAND.name}, an astrology service. It is for entertainment and self-reflection.

DATA RULE: every position, house, aspect, orb, speed, star and date you mention must come from the JSON data. Never estimate or recall a position, never invent a date, never add an aspect, star or pattern that isn't listed. Dates in the data are ISO; write them as "July 23, 2027". If something isn't in the data (for example houses when the birth time is unknown), leave it out.

VOICE: write to the reader as "you": warm, direct, specific and a little bold, like a sharp friend who really knows astrology. Explain jargon in a few plain words the first time. Interpret; every placement answers "so what does this mean for me?". Short paragraphs. Plain text only: no Markdown, no headings inside fields. Use **double asterisks** sparingly for a key phrase or date. Never mention software, calculations, data, JSON or AI.

BOUNDARIES: no medical, legal, financial or psychological advice; never predict death, illness, pregnancy, accidents or disasters; never promise outcomes. Rituals are simple and safe (journaling, intention-setting, a candle never left unattended).`;

const schemaPortrait = obj({
  glanceIntro: str("2-3 sentence portrait of the whole person, e.g. how the Rising, Sun and Moon play together"),
  glanceLines: arr({ label: str("the row label exactly as given"), line: str("one line, under 9 words") }, "One line for each At a Glance row"),
  headline: strArr("'The headline': 2-4 paragraphs on the most unusual, defining features of this chart"),
  angles: arr({ name: str("Ascendant, Midheaven, Descendant or IC"), subtitle: str("e.g. 'how you arrive', 'what you're known for', 'who you attract', 'your roots'"), text: str("1-2 paragraphs, including planets near it, aspects to it and any fixed star on it") }, "The four angles (skip if there are no angles)"),
  planets: arr({ heading: str("e.g. 'Sun in Libra, 11th house' or 'Moon in Pisces, 4th house, conjunct Saturn'"), text: str("one rich paragraph") }, "Planet by planet: Sun to Pluto, then the Nodes, Black Moon Lilith and Part of Fortune"),
  housesWeight: str("'Where the weight sits': which houses are full and empty, and how empty houses work through their rulers"),
  hemispheres: str("one paragraph on the hemisphere balance"),
  wholeSign: str("'Whole-sign check': what shifts in whole-sign houses and how to read both, or empty string if nothing shifts"),
});

const schemaStructure = obj({
  aspectMeanings: arr({ id: str("the row id, e.g. a1"), meaning: str("what it means for you, under 11 words") }, "One line per aspect row"),
  minorNote: str("'Minor aspects worth knowing': one short paragraph, or empty string"),
  patterns: arr({ title: str("pattern title"), text: str("one paragraph") }, "Aspect patterns and stelliums worth naming"),
  shape: str("one or two paragraphs on the chart shape"),
  speeds: arr({ label: str("e.g. 'Stationary — Uranus and Neptune'"), text: str("1-2 sentences") }, "Planet speeds grouped: stationary, very fast, fast, average, slow, retrograde (only groups that exist)"),
  declinations: str("one paragraph on parallels, contra-parallels and any out-of-bounds planets"),
  natalRetros: arr({ planet: str("e.g. 'Mercury Rx'"), meaning: str("table line, under 14 words"), text: str("one paragraph") }, "One entry per natal retrograde planet (empty array if none)"),
  stationNote: str("one or two sentences if a planet stationed within days of birth, else empty string"),
  retroNotes: arr({ id: str("the row id, e.g. r1"), expect: str("what to expect, 1-2 sentences naming natal points it crosses") }, "One note per upcoming retrograde row"),
  harmonics: arr({ title: str("e.g. '5th harmonic — your creative style and power'"), text: str("one paragraph") }, "The 5th, 7th and 9th harmonics"),
  dominants: str("'Dominant planets': one paragraph"),
  elementsText: str("'Elements and modes': one paragraph with the counts"),
  eclipses: str("'Eclipses and the Moon around your birth': one paragraph naming the prenatal eclipses and what they touch"),
  progNotes: arr({ id: str("row id, e.g. p1"), says: str("what it says, 1-2 sentences") }, "One note per progression row"),
  milestoneNotes: arr({ id: str("row id, e.g. m1"), meaning: str("under 14 words") }, "One note per progressed milestone"),
  hdPlain: arr({ element: str("Type, Strategy, Authority, Profile, Definition, Incarnation Cross, Defined centres, Open centres, Channels or Signature / not-self"), plain: str("in plain English, under 18 words") }, "Human Design rows (empty array if there is no Human Design data)"),
  hdEchoes: str("one paragraph on how the Human Design echoes the astrology, or empty string"),
  numerology: str("one paragraph on the Life Path and the personal years given"),
});

const schemaTimeline = obj({
  todayIntro: str("'Today's sky' intro: the Moon phase or nearest lunation and where it lands"),
  todayBullets: strArr("4-6 short bullets: a transiting planet, where it is and what it's doing to the natal chart"),
  stories: arr({ title: str("story title with its date range"), text: str("one or two paragraphs with every key exact date") }, "The four big stories of this period, heaviest first"),
  dateFeels: arr({ id: str("row id, e.g. t1"), feel: str("the feel, under 7 words") }, "One feel per date-by-date row"),
  otherCurrents: str("'Other background currents': one or two sentences, or empty string"),
  cheatSheet: arr({ lead: str("bold lead, under 7 words"), text: str("one or two sentences") }, "'Everything else you should know': the ten things that matter most"),
  lucky: strArr("4-6 lucky / easy windows, each 'date range: what'"),
  growth: strArr("4-6 growth / stretch windows, each 'date range: what'"),
  ritual: obj({
    title: str("ritual name"), when: str("the date and why it was chosen, citing the transit"),
    intro: str("one paragraph"), before: str("optional preparation step, or empty string"),
    steps: arr({ lead: str("e.g. 'Set the space (Libra)'"), text: str("one or two sentences") }, "4-6 steps"),
    followUp: str("optional follow-up on a later lunation, or empty string"),
  }, "Manifestation ritual tied to the next key date"),
});

export interface FullChartText {
  glanceIntro: string; glanceLines: { label: string; line: string }[]; headline: string[];
  angles: { name: string; subtitle: string; text: string }[]; planets: { heading: string; text: string }[];
  housesWeight: string; hemispheres: string; wholeSign: string;
  aspectMeanings: { id: string; meaning: string }[]; minorNote: string; patterns: { title: string; text: string }[]; shape: string;
  speeds: { label: string; text: string }[]; declinations: string; natalRetros: { planet: string; meaning: string; text: string }[];
  stationNote: string; retroNotes: { id: string; expect: string }[]; harmonics: { title: string; text: string }[];
  dominants: string; elementsText: string; eclipses: string; progNotes: { id: string; says: string }[];
  milestoneNotes: { id: string; meaning: string }[]; hdPlain: { element: string; plain: string }[]; hdEchoes: string; numerology: string;
  todayIntro: string; todayBullets: string[]; stories: { title: string; text: string }[]; dateFeels: { id: string; feel: string }[];
  otherCurrents: string; cheatSheet: { lead: string; text: string }[]; lucky: string[]; growth: string[];
  ritual: { title: string; when: string; intro: string; before: string; steps: { lead: string; text: string }[]; followUp: string };
}

export interface FullChartDoc { v: "fullchart1"; calc: Omit<FullChartCalc, "chart" | "_ctx">; text: FullChartText }

export async function fullChartReading(b: BirthData, now = new Date()) {
  const calc = fullChartCalc(b, now);
  const { chart: c, _ctx, ...shown } = calc;
  const natal = {
    bigThree: c.bigThree, chartRuler: c.chartRuler, angles: c.angles, planets: c.planets, points: c.points,
    aspects: c.aspects.slice(0, 30), houseCusps: c.houseCusps?.map(h => `${h.house}: ${h.position}`), warnings: c.warnings,
  };
  const name = c.name;
  const [portrait, structure, timeline] = await Promise.all([
    writeJSON<any>(SYSTEM,
      `Write the first part of ${name}'s Full Chart: At a Glance (a line for each row in "glance"), the headline, the four angles, planet by planet, and the houses commentary. Make the headline about what is genuinely unusual here (dignities, stations near birth, stars on angles, prenatal eclipses on natal points, stelliums).`,
      { natal, glance: shown.glance, houses: shown.houseRows, wholeSignShifts: shown.wholeSignShifts, stars: shown.stars,
        stationsNearBirth: shown.stationsNearBirth, prenatalEclipses: _ctx.eclipses, dominant: _ctx.dominant, hemispheres: _ctx.hemispheres,
        chartShape: _ctx.chartShape, patterns: _ctx.patterns, sect: _ctx.sect },
      schemaPortrait, 9000, { glanceLines: shown.glance.map(g => g.label) }),
    writeJSON<any>(SYSTEM,
      `Write the middle part of ${name}'s Full Chart: aspect meanings, patterns, chart shape, planet speeds, declinations, natal retrogrades (with the age each turns direct by progression), upcoming retrograde periods, harmonics, dominants, elements, prenatal eclipses, progressions, Human Design plain-English rows and numerology. Today is ${calc.header.prepared}.`,
      { natal, aspectRows: shown.aspectRows, minorAspects: shown.minorAspects, patterns: _ctx.patterns, chartShape: _ctx.chartShape,
        speeds: _ctx.speeds, declinations: _ctx.declinations, parallels: _ctx.parallels, natalRetrograde: shown.natalRetros,
        stationsNearBirth: shown.stationsNearBirth, upcomingRetrogrades: _ctx.retroDetail, harmonics: _ctx.harmonics, dominant: _ctx.dominant,
        elements: shown.elements, modalities: shown.modalities, stars: shown.stars, prenatalEclipses: _ctx.eclipses,
        progressions: { rows: shown.progRows, milestones: shown.milestones, detail: _ctx.progressions }, humanDesign: shown.hd, numerology: shown.numerology },
      schemaStructure, 10000, {
        aspectMeanings: shown.aspectRows.map(r => r.id), retroNotes: shown.retros.map(r => r.id), progNotes: shown.progRows.map(r => r.id),
        milestoneNotes: shown.milestones.map(m => m.id), natalRetros: shown.natalRetros.map(r => r.planet),
      }),
    writeJSON<any>(SYSTEM,
      `Write the timeline part of ${name}'s Full Chart for ${calc.header.timelineSpan}: today's sky (today is ${calc.header.prepared}), the four big stories (from keyWindows and house ingresses, with every exact date), a feel for every date-by-date row, the cheat sheet of the ten things that matter most in this chart, lucky versus growth windows, and a manifestation ritual tied to the next key date (use the lunations list for nearby New and Full Moons).`,
      { natal, today: _ctx.today, keyWindows: _ctx.keyWindows, houseIngresses: _ctx.ingresses, dateRows: shown.timelineRows,
        lunationsSoon: _ctx.lunationsSoon, retrogrades: shown.retros, milestones: shown.milestones, stars: shown.stars, humanDesign: shown.hd ? { type: shown.hd.type, authority: shown.hd.authority, profile: shown.hd.profile } : null },
      schemaTimeline, 9000, { dateFeels: shown.timelineRows.map(r => r.id) }),
  ]);
  const doc: FullChartDoc = { v: "fullchart1", calc: shown, text: { ...portrait, ...structure, ...timeline } };
  return { kind: "fullchart" as const, title: `${name}: The Full Chart`, body: JSON.stringify(doc) };
}
