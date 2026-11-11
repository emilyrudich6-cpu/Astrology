// Natal chart analysis: steps 1-7 of the method.
import { DateTime } from "luxon";
import * as A from "astronomy-engine";
import {
  PLANETS, Planet, Sign, SIGNS, norm360, wrap180, angDist, signOf, degInSign, fmtDeg,
  eclipticOf, speedOf, obliquity, declination, meanNode, trueNode, meanLilith,
  computeHouses, houseOf, wholeSignHouseOf, Houses,
} from "./core";

// ---------- Input ----------
export interface BirthData {
  name: string;
  date: string;          // "YYYY-MM-DD"
  time?: string | null;  // "HH:mm" (24h). Missing = time unknown
  timezone: string;      // IANA, e.g. "America/Los_Angeles"
  latitude: number;
  longitude: number;     // east positive
  place?: string;
}

export function birthToUTC(b: BirthData): { utc: Date; timeKnown: boolean; offset: string } {
  const timeKnown = !!b.time;
  const [y, m, d] = b.date.split("-").map(Number);
  const [hh, mm] = (b.time ?? "12:00").split(":").map(Number);
  const dt = DateTime.fromObject({ year: y, month: m, day: d, hour: hh, minute: mm }, { zone: b.timezone });
  if (!dt.isValid) throw new Error(`Invalid birth date/time/timezone: ${dt.invalidExplanation}`);
  return { utc: dt.toUTC().toJSDate(), timeKnown, offset: dt.toFormat("ZZ") };
}

// ---------- Reference tables ----------
export const ELEMENT: Record<Sign, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};
export const MODALITY: Record<Sign, string> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};
export const RULER_MODERN: Record<Sign, Planet> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon", Leo: "Sun", Virgo: "Mercury",
  Libra: "Venus", Scorpio: "Pluto", Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Uranus", Pisces: "Neptune",
};
export const RULER_TRADITIONAL: Record<Sign, Planet> = {
  ...RULER_MODERN, Scorpio: "Mars", Aquarius: "Saturn", Pisces: "Jupiter",
};
const EXALTATION: Partial<Record<Planet, Sign>> = {
  Sun: "Aries", Moon: "Taurus", Mercury: "Virgo", Venus: "Pisces", Mars: "Capricorn", Jupiter: "Cancer", Saturn: "Libra",
};
const opposite = (s: Sign): Sign => SIGNS[(SIGNS.indexOf(s) + 6) % 12];

export function dignity(p: Planet, s: Sign): string {
  const rules = (Object.keys(RULER_MODERN) as Sign[]).filter(x => RULER_MODERN[x] === p || RULER_TRADITIONAL[x] === p);
  if (rules.includes(s)) return "domicile";
  if (EXALTATION[p] === s) return "exaltation";
  if (rules.map(opposite).includes(s)) return "detriment";
  if (EXALTATION[p] && opposite(EXALTATION[p]!) === s) return "fall";
  return "peregrine";
}

// Geocentric |speed| statistics, measured from the ephemeris 1925-2045 (deg/day).
// slow = bottom third, fast = top third, stationary = under 10% of the mean.
const SPEED_STATS: Record<Planet, { mean: number; p33: number; p67: number }> = {
  Sun: { mean: 0.98565, p33: 0.96852, p67: 1.00203 },
  Moon: { mean: 13.17606, p33: 12.39246, p67: 13.80596 },
  Mercury: { mean: 1.21759, p33: 0.96636, p67: 1.57393 },
  Venus: { mean: 1.0407, p33: 1.1055, p67: 1.22694 },
  Mars: { mean: 0.56665, p33: 0.56738, p67: 0.67842 },
  Jupiter: { mean: 0.13289, p33: 0.09804, p67: 0.18071 },
  Saturn: { mean: 0.06932, p33: 0.05113, p67: 0.08794 },
  Uranus: { mean: 0.03353, p33: 0.02518, p67: 0.04195 },
  Neptune: { mean: 0.02117, p33: 0.01605, p67: 0.02693 },
  Pluto: { mean: 0.01904, p33: 0.0142, p67: 0.02417 },
};

export function speedClass(p: Planet, v: number): "fast" | "average" | "slow" | "stationary" {
  const a = Math.abs(v), s = SPEED_STATS[p];
  if (p !== "Sun" && p !== "Moon" && a < 0.1 * s.mean) return "stationary";
  if (a < s.p33) return "slow";
  if (a > s.p67) return "fast";
  return "average";
}

// ---------- Aspects ----------
export interface AspectDef { name: string; angle: number; orb: number; major: boolean; family?: string }
export const ASPECTS: AspectDef[] = [
  { name: "conjunction", angle: 0, orb: 8, major: true },
  { name: "opposition", angle: 180, orb: 8, major: true },
  { name: "trine", angle: 120, orb: 8, major: true },
  { name: "square", angle: 90, orb: 7, major: true },
  { name: "sextile", angle: 60, orb: 5, major: true },
  { name: "quincunx", angle: 150, orb: 3, major: false },
  { name: "semisextile", angle: 30, orb: 2, major: false },
  { name: "semisquare", angle: 45, orb: 2, major: false },
  { name: "sesquiquadrate", angle: 135, orb: 2, major: false },
  { name: "quintile", angle: 72, orb: 1.5, major: false, family: "5th harmonic" },
  { name: "biquintile", angle: 144, orb: 1.5, major: false, family: "5th harmonic" },
];

export interface Point { name: string; lon: number; speed: number; isAngle?: boolean }
export interface Aspect {
  a: string; b: string; aspect: string; major: boolean;
  orb: number; exactAngle: number; motion: "applying" | "separating" | "exact";
}

function orbBonus(a: string, b: string, major: boolean) {
  return major && (a === "Sun" || a === "Moon" || b === "Sun" || b === "Moon") ? 2 : 0;
}

export function findAspects(pa: Point[], pb: Point[], opts: { sameChart: boolean; orbScale?: number }): Aspect[] {
  const res: Aspect[] = [];
  const scale = opts.orbScale ?? 1;
  for (let i = 0; i < pa.length; i++) {
    for (let j = opts.sameChart ? i + 1 : 0; j < pb.length; j++) {
      const A1 = pa[i], B1 = pb[j];
      if (opts.sameChart && A1.isAngle && B1.isAngle) continue;
      const sep = angDist(A1.lon, B1.lon);
      for (const asp of ASPECTS) {
        const orbAllowed = (asp.orb + orbBonus(A1.name, B1.name, asp.major)) * scale;
        const orb = Math.abs(sep - asp.angle);
        if (orb <= orbAllowed) {
          // applying if the orb shrinks a moment later
          const dt = 0.01;
          const sep2 = angDist(A1.lon + A1.speed * dt, B1.lon + B1.speed * dt);
          const orb2 = Math.abs(sep2 - asp.angle);
          const motion = orb < 0.01 ? "exact" : orb2 < orb ? "applying" : "separating";
          res.push({ a: A1.name, b: B1.name, aspect: asp.name, major: asp.major, orb: round(orb, 2), exactAngle: asp.angle, motion });
          break;
        }
      }
    }
  }
  return res.sort((x, y) => x.orb - y.orb);
}

// ---------- Patterns ----------
function aspectBetween(lonA: number, lonB: number, angle: number, orb: number) {
  return Math.abs(angDist(lonA, lonB) - angle) <= orb;
}

export function findPatterns(planets: { name: string; lon: number; sign: string; house: number | null }[]) {
  const out: { pattern: string; planets: string[]; apex?: string; detail?: string }[] = [];
  const n = planets.length;
  // Stelliums (3+ planets in one sign or one house)
  const bySign: Record<string, string[]> = {}, byHouse: Record<string, string[]> = {};
  for (const p of planets) {
    (bySign[p.sign] ??= []).push(p.name);
    if (p.house) (byHouse[p.house] ??= []).push(p.name);
  }
  for (const [s, ps] of Object.entries(bySign)) if (ps.length >= 3) out.push({ pattern: "stellium", planets: ps, detail: `in ${s}` });
  for (const [h, ps] of Object.entries(byHouse)) if (ps.length >= 3) out.push({ pattern: "stellium", planets: ps, detail: `in house ${h}` });

  const P = planets;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
    const [a, b, c] = [P[i], P[j], P[k]];
    // Grand trine
    if (aspectBetween(a.lon, b.lon, 120, 8) && aspectBetween(b.lon, c.lon, 120, 8) && aspectBetween(a.lon, c.lon, 120, 8))
      out.push({ pattern: "grand trine", planets: [a.name, b.name, c.name], detail: `${ELEMENT[a.sign as Sign]} emphasis` });
    // T-square & yod: try each as apex
    for (const [x, y, apex] of [[a, b, c], [a, c, b], [b, c, a]] as const) {
      if (aspectBetween(x.lon, y.lon, 180, 8) && aspectBetween(x.lon, apex.lon, 90, 7) && aspectBetween(y.lon, apex.lon, 90, 7))
        out.push({ pattern: "T-square", planets: [x.name, y.name, apex.name], apex: apex.name });
      if (aspectBetween(x.lon, y.lon, 60, 4) && aspectBetween(x.lon, apex.lon, 150, 3) && aspectBetween(y.lon, apex.lon, 150, 3))
        out.push({ pattern: "yod", planets: [x.name, y.name, apex.name], apex: apex.name });
    }
  }
  // Grand cross: two oppositions square to each other
  const opps: [number, number][] = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (aspectBetween(P[i].lon, P[j].lon, 180, 8)) opps.push([i, j]);
  for (let x = 0; x < opps.length; x++) for (let y = x + 1; y < opps.length; y++) {
    const [i, j] = opps[x], [k, l] = opps[y];
    if (new Set([i, j, k, l]).size < 4) continue;
    if (aspectBetween(P[i].lon, P[k].lon, 90, 7) && aspectBetween(P[i].lon, P[l].lon, 90, 7))
      out.push({ pattern: "grand cross", planets: [P[i].name, P[j].name, P[k].name, P[l].name] });
  }
  // Kite: grand trine + a planet opposite one corner and sextile the other two
  for (const gt of out.filter(o => o.pattern === "grand trine")) {
    for (const q of P) {
      if (gt.planets.includes(q.name)) continue;
      for (const corner of gt.planets) {
        const c = P.find(p => p.name === corner)!;
        const others = gt.planets.filter(x => x !== corner).map(x => P.find(p => p.name === x)!);
        if (aspectBetween(q.lon, c.lon, 180, 8) && others.every(o => aspectBetween(q.lon, o.lon, 60, 5)))
          out.push({ pattern: "kite", planets: [...gt.planets, q.name], apex: corner });
      }
    }
  }
  return out;
}

// ---------- Chart shape (Marc Edmund Jones) ----------
export function chartShape(lons: number[]): { shape: string; emptyArc: number; detail: string } {
  const s = [...lons].map(norm360).sort((a, b) => a - b);
  const gaps = s.map((v, i) => ({ gap: norm360((s[(i + 1) % s.length]) - v) || 360, after: v }));
  const sorted = [...gaps].sort((a, b) => b.gap - a.gap);
  const maxGap = sorted[0].gap;
  const span = 360 - maxGap;
  const r = (shape: string, detail: string) => ({ shape, emptyArc: round(maxGap, 1), detail });
  if (span <= 120) return r("Bundle", "All planets within a third of the chart: concentrated, specialised focus.");
  if (span <= 180) return r("Bowl", "Planets in one half of the chart: self-contained, purposeful, aware of what's missing.");
  // Bucket: one planet alone in the empty half
  for (let i = 0; i < s.length; i++) {
    const rest = s.filter((_, k) => k !== i);
    const shape = chartShapeSpan(rest);
    if (shape.span <= 180 && !inArc(s[i], shape.start, shape.span)) {
      return r("Bucket", `Handle planet at ${fmtDeg(s[i])}: one point channels the whole chart's energy.`);
    }
  }
  if (maxGap >= 120) return r("Locomotive", "Planets across two-thirds of the chart: driven, self-motivated, persistent.");
  if (sorted[1].gap >= 60) return r("Seesaw", "Two opposing groups: weighs opposites, seeks balance between two sides of life.");
  if (gaps.filter(g => g.gap >= 30).length >= 3) return r("Splay", "Irregular clusters: individualistic, strong in a few distinct areas.");
  return r("Splash", "Planets spread around the whole chart: wide-ranging interests and talents.");
}
function chartShapeSpan(lons: number[]) {
  const s = [...lons].sort((a, b) => a - b);
  let maxGap = -1, start = 0;
  for (let i = 0; i < s.length; i++) {
    const g = norm360(s[(i + 1) % s.length] - s[i]) || 360;
    if (g > maxGap) { maxGap = g; start = s[(i + 1) % s.length]; }
  }
  return { span: 360 - maxGap, start };
}
const inArc = (x: number, start: number, span: number) => norm360(x - start) <= span;

// ---------- Moon phase ----------
export function moonPhase(sun: number, moon: number) {
  const e = norm360(moon - sun);
  const names = ["New Moon", "Crescent", "First Quarter", "Gibbous", "Full Moon", "Disseminating", "Last Quarter", "Balsamic"];
  return {
    phase: names[Math.floor(e / 45)],
    elongation: round(e, 1),
    illumination: round(((1 - Math.cos(e * Math.PI / 180)) / 2) * 100, 0),
    waxing: e < 180,
  };
}

// ---------- Harmonics ----------
export function harmonics(points: { name: string; lon: number }[], h: number) {
  const hp = points.map(p => ({ name: p.name, lon: norm360(p.lon * h) }));
  const orb = 10; // conjunction orb in the harmonic chart (= 10/h degrees natally)
  const pairs: { a: string; b: string; orbHarmonic: number; natalOrb: number }[] = [];
  for (let i = 0; i < hp.length; i++) for (let j = i + 1; j < hp.length; j++) {
    const d = angDist(hp[i].lon, hp[j].lon);
    if (angDist(points[i].lon, points[j].lon) <= orb / h) continue; // already conjunct natally
    if (d <= orb) pairs.push({ a: hp[i].name, b: hp[j].name, orbHarmonic: round(d, 2), natalOrb: round(d / h, 2) });
  }
  // Clusters: connected groups of 3+
  const adj = new Map<string, Set<string>>();
  for (const p of pairs) { (adj.get(p.a) ?? adj.set(p.a, new Set()).get(p.a)!).add(p.b); (adj.get(p.b) ?? adj.set(p.b, new Set()).get(p.b)!).add(p.a); }
  const seen = new Set<string>(); const clusters: string[][] = [];
  for (const k of adj.keys()) {
    if (seen.has(k)) continue;
    const stack = [k], group: string[] = [];
    while (stack.length) { const x = stack.pop()!; if (seen.has(x)) continue; seen.add(x); group.push(x); adj.get(x)!.forEach(y => stack.push(y)); }
    if (group.length >= 3) clusters.push(group);
  }
  const meaning: Record<number, string> = { 5: "creative talent, style, how you build and craft", 7: "inspiration, spirituality, what moves and enchants you", 9: "joy, fulfilment, what brings peace and completion" };
  return {
    harmonic: h, meaning: meaning[h] ?? "",
    positions: hp.map(p => ({ name: p.name, position: fmtDeg(p.lon) })),
    note: "Harmonic conjunctions only; pairs already conjunct in the natal chart are excluded.",
    conjunctions: pairs.sort((a, b) => a.orbHarmonic - b.orbHarmonic),
    clusters,
  };
}

// ---------- Full natal chart ----------
export interface PlanetInfo {
  name: Planet; lon: number; position: string; sign: Sign; degree: number;
  house: number | null; wholeSignHouse: number | null; houseDiffers: boolean;
  speed: number; speedClass: string; retrograde: boolean;
  declination: number; outOfBounds: boolean; dignity: string;
}

export function natalChart(b: BirthData) {
  const { utc, timeKnown, offset } = birthToUTC(b);
  const eps = obliquity(utc);
  const houses: Houses | null = timeKnown ? computeHouses(utc, b.latitude, b.longitude) : null;

  const planets: PlanetInfo[] = PLANETS.map(name => {
    const e = eclipticOf(name, utc);
    const speed = speedOf(name, utc);
    const dec = declination(e.lon, e.lat, eps);
    const house = houses ? houseOf(e.lon, houses.cusps) : null;
    const ws = houses ? wholeSignHouseOf(e.lon, houses.asc) : null;
    return {
      name, lon: round(e.lon, 4), position: fmtDeg(e.lon), sign: signOf(e.lon), degree: round(degInSign(e.lon), 2),
      house, wholeSignHouse: ws, houseDiffers: house !== ws,
      speed: round(speed, 4), speedClass: speedClass(name, speed), retrograde: speed < 0,
      declination: round(dec, 2), outOfBounds: Math.abs(dec) > eps, dignity: dignity(name, signOf(e.lon)),
    };
  });
  const P = Object.fromEntries(planets.map(p => [p.name, p])) as Record<Planet, PlanetInfo>;

  // Angles
  const angles = houses ? {
    Ascendant: houses.asc, Midheaven: houses.mc,
    Descendant: norm360(houses.asc + 180), IC: norm360(houses.mc + 180),
  } : null;
  const angleInfo = angles ? Object.entries(angles).map(([name, lon]) => ({
    name, lon: round(lon, 4), position: fmtDeg(lon),
    planetsWithin8: planets.filter(p => angDist(p.lon, lon) <= 8)
      .map(p => ({ planet: p.name, orb: round(angDist(p.lon, lon), 2), side: wrap180(p.lon - lon) < 0 ? "before (zodiacally)" : "after (zodiacally)" }))
      .sort((a, b) => a.orb - b.orb),
  })) : null;

  // Points
  const mNode = meanNode(utc), tNode = trueNode(utc), lilith = meanLilith(utc);
  const isDay = houses ? [7, 8, 9, 10, 11, 12].includes(houseOf(P.Sun.lon, houses.cusps)) : null;
  const fortune = houses ? norm360(isDay ? houses.asc + P.Moon.lon - P.Sun.lon : houses.asc + P.Sun.lon - P.Moon.lon) : null;
  const pointList = [
    { name: "North Node (true)", lon: tNode },
    { name: "South Node (true)", lon: norm360(tNode + 180) },
    { name: "North Node (mean)", lon: mNode },
    { name: "Black Moon Lilith (mean)", lon: lilith },
    ...(fortune != null ? [{ name: "Part of Fortune", lon: fortune }] : []),
  ].map(p => ({
    ...p, lon: round(p.lon, 4), position: fmtDeg(p.lon),
    house: houses ? houseOf(p.lon, houses.cusps) : null,
    conjunctPlanets: planets.filter(x => angDist(x.lon, p.lon) <= 3).map(x => `${x.name} (${round(angDist(x.lon, p.lon), 2)}°)`),
  }));

  // Aspects: planets + angles + true node
  const aspectPoints: Point[] = [
    ...planets.map(p => ({ name: p.name, lon: p.lon, speed: p.speed })),
    ...(houses ? [{ name: "Ascendant", lon: houses.asc, speed: 0, isAngle: true }, { name: "Midheaven", lon: houses.mc, speed: 0, isAngle: true }] : []),
    { name: "North Node", lon: tNode, speed: -0.053 },
  ];
  const aspects = findAspects(aspectPoints, aspectPoints, { sameChart: true })
    .filter(a => !(a.a === "North Node" && a.b === "North Node"));

  const patterns = findPatterns(planets.map(p => ({ name: p.name, lon: p.lon, sign: p.sign, house: p.house })));

  // Chart ruler
  let chartRuler = null;
  if (houses) {
    const ascSign = signOf(houses.asc);
    const rulers = [...new Set([RULER_MODERN[ascSign], RULER_TRADITIONAL[ascSign]])];
    chartRuler = rulers.map((r, i) => {
      const p = P[r];
      return {
        planet: r, kind: rulers.length > 1 ? (i === 0 ? "modern ruler" : "traditional ruler") : "ruler",
        ascendantSign: ascSign, position: p.position, house: p.house, wholeSignHouse: p.wholeSignHouse,
        dignity: p.dignity, retrograde: p.retrograde, speedClass: p.speedClass, outOfBounds: p.outOfBounds,
        aspects: aspects.filter(a => a.a === r || a.b === r).slice(0, 6),
      };
    });
  }

  // Balance (10 planets; Sun, Moon and chart ruler counted as weighted extras)
  const count = (key: (s: Sign) => string) => {
    const c: Record<string, string[]> = {};
    for (const p of planets) (c[key(p.sign)] ??= []).push(p.name);
    if (houses) { (c[key(signOf(houses.asc))] ??= []).push("Ascendant"); (c[key(signOf(houses.mc))] ??= []).push("Midheaven"); }
    return c;
  };
  const elements = count(s => ELEMENT[s]);
  const modalities = count(s => MODALITY[s]);
  const hemispheres = houses ? {
    above: planets.filter(p => p.house! >= 7).map(p => p.name),
    below: planets.filter(p => p.house! <= 6).map(p => p.name),
    east: planets.filter(p => [10, 11, 12, 1, 2, 3].includes(p.house!)).map(p => p.name),
    west: planets.filter(p => [4, 5, 6, 7, 8, 9].includes(p.house!)).map(p => p.name),
  } : null;

  const harmonicPoints = [...planets.map(p => ({ name: p.name, lon: p.lon })),
    ...(houses ? [{ name: "Ascendant", lon: houses.asc }, { name: "Midheaven", lon: houses.mc }] : [])];

  return {
    name: b.name,
    birth: { ...b, utc: utc.toISOString(), utcOffset: offset, timeKnown },
    warnings: [
      ...(!timeKnown ? ["Birth time unknown: houses, angles, Part of Fortune and the chart ruler are left out, and the Moon may be up to ~7° off. Positions use noon."] : []),
      ...(houses?.note ? [houses.note] : []),
    ],
    houseSystem: houses?.system ?? null,
    obliquity: round(eps, 4),
    // 1. Big three + chart ruler
    bigThree: {
      sun: P.Sun.position, moon: P.Moon.position,
      ascendant: houses ? fmtDeg(houses.asc) : "unknown (no birth time)",
    },
    chartRuler,
    // 2. Angles
    angles: angleInfo,
    houseCusps: houses ? houses.cusps.map((c, i) => ({ house: i + 1, position: fmtDeg(c), lon: round(c, 4) })) : null,
    // 3. Planets
    planets,
    // 4. Aspects & patterns
    aspects,
    patterns,
    // 5. Shape, balance, hemispheres, Moon phase
    chartShape: chartShape(planets.map(p => p.lon)),
    elements, modalities, hemispheres,
    sect: isDay == null ? null : isDay ? "day chart" : "night chart",
    moonPhase: moonPhase(P.Sun.lon, P.Moon.lon),
    // 6. Points
    points: pointList,
    // 7. Harmonics
    harmonics: [5, 7, 9].map(h => harmonics(harmonicPoints, h)),
  };
}
export type NatalChart = ReturnType<typeof natalChart>;

export function round(x: number, d: number) { const f = 10 ** d; return Math.round(x * f) / f; }
export { A };
