// Step 8 (timing) and step 9 (two people) of the method.
import * as A from "astronomy-engine";
import { PLANETS, Planet, lonOf, speedOf, norm360, wrap180, angDist, fmtDeg, signOf, houseOf } from "./core";
import { NatalChart, findAspects, Point, round, moonPhase } from "./natal";

// ---------- Themes ----------
export const POINT_THEMES: Record<string, string[]> = {
  Sun: ["identity", "vitality", "purpose"], Moon: ["emotions", "home", "family"],
  Mercury: ["communication", "ideas", "deals"], Venus: ["love", "money", "beauty"],
  Mars: ["drive", "ambition", "energy"], Jupiter: ["growth", "luck", "opportunity"],
  Saturn: ["commitment", "structure", "responsibility"], Uranus: ["change", "freedom", "breakthroughs"],
  Neptune: ["dreams", "spirituality", "creativity"], Pluto: ["power", "transformation"],
  Ascendant: ["self", "image", "new beginnings"], Midheaven: ["career", "reputation", "public life"],
  "North Node": ["destiny", "life direction"],
};
export const HOUSE_THEMES: Record<number, string> = {
  1: "self, image, body", 2: "money, values, self-worth", 3: "communication, siblings, short trips",
  4: "home, family, roots", 5: "romance, creativity, fun, children", 6: "daily work, routines, wellness habits",
  7: "partnerships, marriage, contracts", 8: "intimacy, shared money, transformation", 9: "travel, beliefs, study, publishing",
  10: "career, reputation, status", 11: "friends, networks, hopes", 12: "rest, spirituality, the hidden",
};
/** Question categories -> which natal points and houses matter */
export const CATEGORY_FOCUS: Record<string, { points: string[]; houses: number[] }> = {
  love: { points: ["Venus", "Mars", "Moon", "Descendant"], houses: [5, 7, 8] },
  career: { points: ["Midheaven", "Saturn", "Sun", "Jupiter"], houses: [6, 10] },
  money: { points: ["Venus", "Jupiter"], houses: [2, 8] },
  home: { points: ["Moon", "IC"], houses: [4] },
  friends: { points: ["Mercury", "Uranus"], houses: [3, 11] },
  growth: { points: ["Neptune", "North Node", "Jupiter"], houses: [9, 12] },
  self: { points: ["Sun", "Ascendant", "Mars"], houses: [1] },
};

const TRANSIT_WEIGHT: Record<Planet, number> = {
  Sun: 3, Moon: 1, Mercury: 2, Venus: 2, Mars: 4, Jupiter: 7, Saturn: 8, Uranus: 9, Neptune: 9, Pluto: 10,
};
const ASPECT_WEIGHT: Record<string, number> = { conjunction: 1, opposition: 0.9, square: 0.9, trine: 0.65, sextile: 0.5, quincunx: 0.4 };
const NATAL_WEIGHT = (n: string) => ["Sun", "Moon", "Ascendant", "Midheaven"].includes(n) ? 1.25
  : ["Uranus", "Neptune", "Pluto"].includes(n) ? 0.6 : n === "North Node" ? 0.8 : 1;

const WINDOW_ORB: Record<Planet, number> = {
  Sun: 1, Moon: 1, Mercury: 1, Venus: 1, Mars: 1.5, Jupiter: 2, Saturn: 2, Uranus: 1.5, Neptune: 1.5, Pluto: 1.5,
};
const MAJOR = [
  { name: "conjunction", angle: 0 }, { name: "opposition", angle: 180 }, { name: "square", angle: 90 },
  { name: "trine", angle: 120 }, { name: "sextile", angle: 60 },
];

const DAY = 86400000;
const iso = (d: Date) => d.toISOString();
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);

/** Natal targets that transits can hit */
export function natalTargets(c: NatalChart): { name: string; lon: number; house: number | null }[] {
  const t = c.planets.map(p => ({ name: p.name as string, lon: p.lon, house: p.house }));
  if (c.angles) {
    const asc = c.angles.find(a => a.name === "Ascendant")!, mc = c.angles.find(a => a.name === "Midheaven")!;
    t.push({ name: "Ascendant", lon: asc.lon, house: 1 }, { name: "Midheaven", lon: mc.lon, house: 10 });
  }
  const nn = c.points.find(p => p.name === "North Node (true)")!;
  t.push({ name: "North Node", lon: nn.lon, house: nn.house });
  return t;
}

// ---------- Today's transits ----------
export function currentTransits(c: NatalChart, when: Date = new Date()) {
  const cusps = c.houseCusps?.map(h => h.lon) ?? null;
  const transiting = PLANETS.map(p => {
    const lon = lonOf(p, when), speed = speedOf(p, when);
    return { name: p, lon: round(lon, 4), position: fmtDeg(lon), retrograde: speed < 0, natalHouse: cusps ? houseOf(lon, cusps) : null, speed };
  });
  const targets = natalTargets(c);
  const orbs: Record<Planet, number> = { Sun: 3, Moon: 4, Mercury: 3, Venus: 3, Mars: 3, Jupiter: 3, Saturn: 3, Uranus: 2, Neptune: 2, Pluto: 2 };
  const res: any[] = [];
  for (const t of transiting) for (const n of targets) {
    const sep = angDist(t.lon, n.lon);
    for (const a of [...MAJOR, { name: "quincunx", angle: 150 }]) {
      const orb = Math.abs(sep - a.angle);
      if (orb <= orbs[t.name]) {
        const sep2 = angDist(t.lon + t.speed * 0.1, n.lon);
        res.push({
          transiting: t.name, aspect: a.name, natal: n.name, orb: round(orb, 2),
          motion: Math.abs(sep2 - a.angle) < orb ? "applying" : "separating",
          weight: round(TRANSIT_WEIGHT[t.name] * (ASPECT_WEIGHT[a.name] ?? 0.4) * NATAL_WEIGHT(n.name), 2),
          themes: POINT_THEMES[n.name] ?? [], natalHouseTheme: n.house ? HOUSE_THEMES[n.house] : null,
        });
      }
    }
  }
  const sun = transiting[0].lon, moon = transiting[1].lon;
  return {
    date: iso(when),
    sky: transiting.map(({ speed, ...t }) => t),
    moonPhase: moonPhase(sun, moon),
    aspectsToNatal: res.sort((a, b) => b.weight - a.weight || a.orb - b.orb),
  };
}

// ---------- Exact transit dates over a period ----------
export interface TransitPass { start: string; end: string; exact: { date: string; retrograde: boolean }[] }
export interface TransitEvent {
  transiting: Planet; aspect: string; natal: string; natalPosition: string;
  natalHouse: number | null; themes: string[]; houseTheme: string | null;
  weight: number; passes: TransitPass[];
}

export interface TimelineOptions {
  bodies?: Planet[];
  aspects?: string[];
  stepDays?: number;
}

function bisect(f: (t: number) => number, a: number, b: number): number {
  let fa = f(a);
  for (let i = 0; i < 40 && b - a > 30000; i++) { // to 30 seconds
    const m = (a + b) / 2, fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

/** Positions sampled once per step for each body, cached across targets */
function sampleBody(p: Planet, start: number, end: number, step: number) {
  const ts: number[] = [], lons: number[] = [];
  for (let t = start; t <= end + step; t += step) { ts.push(t); lons.push(lonOf(p, new Date(t))); }
  return { ts, lons };
}

export function transitTimeline(c: NatalChart, start: Date, end: Date, opts: TimelineOptions = {}): TransitEvent[] {
  const bodies = opts.bodies ?? ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  const aspects = MAJOR.filter(a => !opts.aspects || opts.aspects.includes(a.name));
  const targets = natalTargets(c);
  const s0 = start.getTime(), e0 = end.getTime();
  const events: TransitEvent[] = [];

  for (const body of bodies) {
    const step = (opts.stepDays ?? (["Sun", "Mercury", "Venus", "Mars"].includes(body) ? 0.5 : 1)) * DAY;
    const { ts, lons } = sampleBody(body, s0, e0, step);
    const orb = WINDOW_ORB[body];
    for (const n of targets) {
      for (const a of aspects) {
        const angles = a.angle === 0 || a.angle === 180 ? [a.angle] : [a.angle, -a.angle];
        const passes: TransitPass[] = [];
        for (const ang of angles) {
          const target = norm360(n.lon + ang);
          const f = (t: number) => wrap180(lonOf(body, new Date(t)) - target);
          const fs = lons.map(l => wrap180(l - target));
          // windows where |f| <= orb
          let i = 0;
          while (i < ts.length) {
            if (Math.abs(fs[i]) > orb) { i++; continue; }
            const wStart = i;
            while (i < ts.length && Math.abs(fs[i]) <= orb) i++;
            const wEnd = i - 1;
            // exact crossings inside (and at the edges of) the window
            const exact: { date: string; retrograde: boolean }[] = [];
            for (let k = Math.max(wStart - 1, 0); k < Math.min(wEnd + 1, ts.length - 1); k++) {
              if (Math.abs(fs[k]) < 30 && Math.abs(fs[k + 1]) < 30 && (fs[k] === 0 || Math.sign(fs[k]) !== Math.sign(fs[k + 1]))) {
                const tx = bisect(f, ts[k], ts[k + 1]);
                if (tx >= s0 && tx <= e0) exact.push({ date: iso(new Date(tx)), retrograde: speedOf(body, new Date(tx)) < 0 });
              }
            }
            // Keep windows that peak in range, or that are in effect at the start
            const peaksInRange = exact.length > 0;
            const activeAtStart = wStart === 0;
            if (peaksInRange || activeAtStart) {
              passes.push({
                start: dateOnly(new Date(Math.max(ts[wStart], s0))),
                end: dateOnly(new Date(Math.min(ts[wEnd], e0))),
                exact,
              });
            }
          }
        }
        if (passes.length) {
          passes.sort((x, y) => x.start.localeCompare(y.start));
          events.push({
            transiting: body, aspect: a.name, natal: n.name, natalPosition: fmtDeg(n.lon),
            natalHouse: n.house, themes: POINT_THEMES[n.name] ?? [], houseTheme: n.house ? HOUSE_THEMES[n.house] : null,
            weight: round(TRANSIT_WEIGHT[body] * ASPECT_WEIGHT[a.name] * NATAL_WEIGHT(n.name), 2),
            passes,
          });
        }
      }
    }
  }
  const firstExact = (e: TransitEvent) => e.passes.flatMap(p => p.exact.map(x => x.date))[0] ?? e.passes[0].start;
  return events.sort((a, b) => firstExact(a).localeCompare(firstExact(b)));
}

// ---------- Stations, ingresses, lunations, eclipses ----------
export function skyEvents(c: NatalChart, start: Date, end: Date) {
  const cusps = c.houseCusps?.map(h => h.lon) ?? null;
  const targets = natalTargets(c);
  const s0 = start.getTime(), e0 = end.getTime();
  const stations: any[] = [], ingresses: any[] = [];
  for (const body of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as Planet[]) {
    let prevV = speedOf(body, new Date(s0)), prevLon = lonOf(body, new Date(s0)), prevT = s0;
    for (let t = s0 + DAY; t <= e0; t += DAY) {
      const v = speedOf(body, new Date(t)), lon = lonOf(body, new Date(t));
      if (Math.sign(v) !== Math.sign(prevV)) {
        const tx = bisect(x => speedOf(body, new Date(x)), prevT, t);
        const sl = lonOf(body, new Date(tx));
        stations.push({
          date: iso(new Date(tx)), planet: body, station: v < 0 ? "stations retrograde" : "stations direct",
          position: fmtDeg(sl), natalHouse: cusps ? houseOf(sl, cusps) : null,
          onNatalPoints: targets.flatMap(n => MAJOR.filter(a => Math.abs(angDist(sl, n.lon) - a.angle) <= 2)
            .map(a => `${a.name} natal ${n.name} (${round(Math.abs(angDist(sl, n.lon) - a.angle), 2)}°)`)),
        });
      }
      if (Math.floor(lon / 30) !== Math.floor(prevLon / 30) && ["Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(body)) {
        ingresses.push({ date: dateOnly(new Date(t)), planet: body, enters: `sign ${signOf(lon)}`, retrograde: v < 0 });
      }
      if (cusps && ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(body)) {
        const h0 = houseOf(prevLon, cusps), h1 = houseOf(lon, cusps);
        if (h0 !== h1) ingresses.push({ date: dateOnly(new Date(t)), planet: body, enters: `your natal house ${h1} (${HOUSE_THEMES[h1]})`, retrograde: v < 0 });
      }
      prevV = v; prevLon = lon; prevT = t;
    }
  }
  // New & full moons
  const lunations: any[] = [];
  for (const [phase, label] of [[0, "New Moon"], [180, "Full Moon"]] as const) {
    let t = new Date(s0);
    for (;;) {
      const r = A.SearchMoonPhase(phase, t, 40);
      if (!r || r.date.getTime() > e0) break;
      const moon = lonOf("Moon", r.date);
      lunations.push({
        date: iso(r.date), type: label, position: fmtDeg(moon),
        natalHouse: cusps ? houseOf(moon, cusps) : null,
        houseTheme: cusps ? HOUSE_THEMES[houseOf(moon, cusps)] : null,
        hitsNatal: targets.filter(n => angDist(moon, n.lon) <= 3 || (label === "Full Moon" && angDist(norm360(moon + 180), n.lon) <= 3))
          .map(n => n.name),
        eclipse: null as string | null,
      });
      t = new Date(r.date.getTime() + 5 * DAY);
    }
  }
  // Eclipses
  let le = A.SearchLunarEclipse(new Date(s0 - 2 * DAY));
  while (le.peak.date.getTime() <= e0) {
    const m = lunations.find(l => l.type === "Full Moon" && Math.abs(new Date(l.date).getTime() - le.peak.date.getTime()) < 2 * DAY);
    if (m) m.eclipse = `${le.kind} lunar eclipse`;
    le = A.NextLunarEclipse(le.peak);
  }
  let se = A.SearchGlobalSolarEclipse(new Date(s0 - 2 * DAY));
  while (se.peak.date.getTime() <= e0) {
    const m = lunations.find(l => l.type === "New Moon" && Math.abs(new Date(l.date).getTime() - se.peak.date.getTime()) < 2 * DAY);
    if (m) m.eclipse = `${se.kind} solar eclipse`;
    se = A.NextGlobalSolarEclipse(se.peak.date);
  }
  return {
    stations: stations.sort((a, b) => a.date.localeCompare(b.date)),
    ingresses: ingresses.sort((a, b) => a.date.localeCompare(b.date)),
    lunations: lunations.sort((a, b) => a.date.localeCompare(b.date)),
  };
}

// ---------- Grouping into themes and windows ----------
export function groupTimeline(events: TransitEvent[]) {
  // Themes: by life area
  const themes: Record<string, { transits: string[]; totalWeight: number }> = {};
  for (const e of events) {
    for (const th of [...e.themes, ...(e.houseTheme ? [e.houseTheme] : [])]) {
      const t = (themes[th] ??= { transits: [], totalWeight: 0 });
      t.transits.push(`${e.transiting} ${e.aspect} ${e.natal}`);
      t.totalWeight += e.weight;
    }
  }
  // Monthly intensity (sum of weights of transits exact or in orb that month)
  const months: Record<string, { weight: number; peaks: { date: string; transit: string; weight: number }[] }> = {};
  for (const e of events) {
    for (const p of e.passes) {
      for (const x of p.exact) {
        const m = x.date.slice(0, 7);
        const mm = (months[m] ??= { weight: 0, peaks: [] });
        mm.weight += e.weight;
        mm.peaks.push({ date: x.date.slice(0, 10), transit: `${e.transiting}${x.retrograde ? " (Rx)" : ""} ${e.aspect} natal ${e.natal}`, weight: e.weight });
      }
    }
  }
  const monthList = Object.entries(months).sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, intensity: round(v.weight, 1), peaks: v.peaks.sort((a, b) => b.weight - a.weight) }));
  // Key windows: long transits from the slow planets, merged across retrograde passes
  const keyWindows = events.filter(e => e.weight >= 4)
    .map(e => ({
      transit: `${e.transiting} ${e.aspect} natal ${e.natal}`,
      from: e.passes[0].start, to: e.passes[e.passes.length - 1].end,
      exactDates: e.passes.flatMap(p => p.exact.map(x => x.date.slice(0, 10) + (x.retrograde ? " (Rx)" : ""))),
      themes: e.themes, houseTheme: e.houseTheme, weight: e.weight,
    }))
    .sort((a, b) => b.weight - a.weight);
  return {
    themes: Object.entries(themes).map(([theme, v]) => ({ theme, weight: round(v.totalWeight, 1), transits: [...new Set(v.transits)] }))
      .sort((a, b) => b.weight - a.weight),
    months: monthList,
    keyWindows,
  };
}

/** Full timing package for a period */
export function timing(c: NatalChart, start: Date, end: Date, opts: TimelineOptions = {}) {
  const events = transitTimeline(c, start, end, opts);
  return {
    period: { start: dateOnly(start), end: dateOnly(end) },
    today: currentTransits(c, start),
    exactTransits: events.map(e => ({
      transit: `${e.transiting} ${e.aspect} natal ${e.natal} (${e.natalPosition}${e.natalHouse ? `, house ${e.natalHouse}` : ""})`,
      natal: e.natal, natalHouse: e.natalHouse,
      weight: e.weight, themes: e.themes, houseTheme: e.houseTheme, passes: e.passes,
    })),
    grouped: groupTimeline(events),
    sky: skyEvents(c, start, end),
  };
}

// ---------- Synastry (step 9) ----------
export function synastry(a: NatalChart, b: NatalChart) {
  const pts = (c: NatalChart): Point[] => [
    ...c.planets.map(p => ({ name: p.name, lon: p.lon, speed: 0 })),
    ...(c.angles ? [{ name: "Ascendant", lon: c.angles[0].lon, speed: 0 }, { name: "Midheaven", lon: c.angles[1].lon, speed: 0 }] : []),
    { name: "North Node", lon: c.points[0].lon, speed: 0 },
  ];
  const aspects = findAspects(pts(a), pts(b), { sameChart: false })
    .filter(x => !(x.a === "North Node" && x.b === "North Node"))
    .map(x => ({ [a.name]: x.a, aspect: x.aspect, [b.name]: x.b, orb: x.orb, major: x.major }));
  const overlay = (from: NatalChart, into: NatalChart) => into.houseCusps
    ? from.planets.map(p => {
        const h = houseOf(p.lon, into.houseCusps!.map(c => c.lon));
        return { planet: `${from.name}'s ${p.name}`, falls_in: `${into.name}'s house ${h}`, houseTheme: HOUSE_THEMES[h] };
      })
    : `${into.name}'s birth time is unknown, so their houses can't be used.`;
  return {
    aspects,
    houseOverlays: { [`${a.name} in ${b.name}'s houses`]: overlay(a, b), [`${b.name} in ${a.name}'s houses`]: overlay(b, a) },
  };
}

/** How two people's timelines interact over a period */
export function timelinesTogether(a: NatalChart, b: NatalChart, start: Date, end: Date) {
  const opts: TimelineOptions = { bodies: ["Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] };
  const ta = transitTimeline(a, start, end, opts), tb = transitTimeline(b, start, end, opts);
  // 1. Same transiting planet hitting both charts in overlapping windows
  const shared: any[] = [];
  for (const x of ta) for (const y of tb) {
    if (x.transiting !== y.transiting) continue;
    for (const px of x.passes) for (const py of y.passes) {
      const from = px.start > py.start ? px.start : py.start, to = px.end < py.end ? px.end : py.end;
      if (from <= to) shared.push({
        transiting: x.transiting, from, to,
        [a.name]: `${x.aspect} natal ${x.natal}`, [b.name]: `${y.aspect} natal ${y.natal}`,
        weight: round(x.weight + y.weight, 2),
      });
    }
  }
  // 2. Transits to the tightest synastry contacts (these "trigger" the bond)
  const syn = synastry(a, b).aspects.filter(s => s.orb <= 2 && s.major);
  const triggers: any[] = [];
  for (const s of syn) {
    const pa = s[a.name] as string, pb = s[b.name] as string;
    for (const e of ta.filter(e => e.natal === pa)) for (const p of e.passes) for (const x of p.exact)
      triggers.push({ date: x.date.slice(0, 10), transit: `${e.transiting} ${e.aspect} ${a.name}'s ${pa}`, activates: `${a.name}'s ${pa} ${s.aspect} ${b.name}'s ${pb}`, weight: e.weight });
    for (const e of tb.filter(e => e.natal === pb)) for (const p of e.passes) for (const x of p.exact)
      triggers.push({ date: x.date.slice(0, 10), transit: `${e.transiting} ${e.aspect} ${b.name}'s ${pb}`, activates: `${a.name}'s ${pa} ${s.aspect} ${b.name}'s ${pb}`, weight: e.weight });
  }
  // 3. Months where both are under heavy transits
  const ga = groupTimeline(ta).months, gb = groupTimeline(tb).months;
  const bothBusy = ga.map(m => ({ month: m.month, [a.name]: m.intensity, [b.name]: gb.find(x => x.month === m.month)?.intensity ?? 0 }))
    .filter(m => (m[a.name] as number) > 0 && (m[b.name] as number) > 0)
    .sort((x, y) => ((y[a.name] as number) + (y[b.name] as number)) - ((x[a.name] as number) + (x[b.name] as number)));
  return {
    sharedTransits: shared.sort((x, y) => y.weight - x.weight).slice(0, 25),
    bondTriggers: triggers.sort((x, y) => x.date.localeCompare(y.date)),
    busiestMonthsForBoth: bothBusy.slice(0, 6),
  };
}
