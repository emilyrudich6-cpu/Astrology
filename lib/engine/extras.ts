// Extra calculations for the Full Chart reading: fixed stars, prenatal eclipses,
// secondary progressions, natal retrogrades turning direct, upcoming retrograde
// periods, Human Design and numerology. All positions are tropical and geocentric.
import * as A from "astronomy-engine";
import {
  PLANETS, Planet, lonOf, speedOf, norm360, wrap180, angDist, fmtDeg, signOf, houseOf, SIGNS, trueNode,
} from "./core";
import { NatalChart, round } from "./natal";
import { lifePath, birthdayNumber, personalYear } from "../numerology";
import { natalTargets, HOUSE_THEMES } from "./transits";

const DAY = 86400000;
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY);
const dateOnly = (d: Date) => d.toISOString().slice(0, 10);
const cuspsOf = (c: NatalChart) => c.houseCusps?.map(h => h.lon) ?? null;
const birthDate = (c: NatalChart) => new Date(c.birth.utc);

/** Orb in degrees as 0°25′ */
export function fmtOrb(x: number) {
  let d = Math.floor(x), m = Math.round((x - d) * 60);
  if (m === 60) { d++; m = 0; }
  return `${d}°${String(m).padStart(2, "0")}′`;
}

function bisect(f: (t: number) => number, a: number, b: number) {
  let fa = f(a);
  for (let i = 0; i < 50 && b - a > 30000; i++) {
    const m = (a + b) / 2, fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}

// ---------------- Fixed stars ----------------
// Tropical longitudes at J2000, precessed at 50.29″ a year.
const STARS: { name: string; lon: number; flavour: string }[] = [
  { name: "Alpheratz", lon: 14.30, flavour: "Independence, freedom of movement, a popular spirit" },
  { name: "Mirach", lon: 30.40, flavour: "Charm, devotion and a talent for beauty" },
  { name: "Hamal", lon: 37.67, flavour: "Drive and headstrong independence" },
  { name: "Menkar", lon: 44.32, flavour: "Absorbing the moods of the collective" },
  { name: "Algol", lon: 56.17, flavour: "Intense, primal power; strength from facing fears" },
  { name: "Alcyone (Pleiades)", lon: 59.99, flavour: "Vision and sensitivity; seeing what others miss" },
  { name: "Aldebaran", lon: 69.79, flavour: "Royal star: integrity and success through courage" },
  { name: "Rigel", lon: 76.83, flavour: "Teaching, skill and rising through learning" },
  { name: "Bellatrix", lon: 80.95, flavour: "Quick wits and a fighting spirit" },
  { name: "Capella", lon: 81.85, flavour: "Curiosity, love of learning and new things" },
  { name: "Polaris", lon: 88.57, flavour: "A sense of direction; the guiding light for others" },
  { name: "Betelgeuse", lon: 88.75, flavour: "Success, honours and lasting achievement" },
  { name: "Sirius", lon: 104.08, flavour: "Brilliance, ambition, a burning drive to shine" },
  { name: "Canopus", lon: 104.97, flavour: "The navigator: guiding others through unknown waters" },
  { name: "Castor", lon: 110.23, flavour: "A brilliant, versatile mind; storytelling" },
  { name: "Pollux", lon: 113.22, flavour: "Boldness and a sharp competitive edge" },
  { name: "Procyon", lon: 115.79, flavour: "Quick rises, quick action, seize the moment" },
  { name: "Praesepe", lon: 127.33, flavour: "Industry and a busy, creative hive of ideas" },
  { name: "Acubens", lon: 133.64, flavour: "Protection; a safe place for others" },
  { name: "Alphard", lon: 147.29, flavour: "Deep emotional wisdom; strong passions" },
  { name: "Regulus", lon: 149.83, flavour: "Royal star: fame, leadership, honours; avoid revenge" },
  { name: "Zosma", lon: 161.32, flavour: "A helper to others; strength through service" },
  { name: "Denebola", lon: 171.63, flavour: "An independent streak; going against the crowd" },
  { name: "Vindemiatrix", lon: 189.93, flavour: "Discerning, critical mind; prone to worry" },
  { name: "Algorab", lon: 193.45, flavour: "Resourcefulness; a strong will, best used generously" },
  { name: "Spica", lon: 203.84, flavour: "Gifts, talent and protection; brilliance in the arts" },
  { name: "Arcturus", lon: 204.23, flavour: "Prosperity by charting your own course" },
  { name: "Zuben Elgenubi", lon: 225.08, flavour: "Social reform; fairness for the many" },
  { name: "Zuben Eschamali", lon: 229.37, flavour: "Ambition and lucky breaks after effort" },
  { name: "Unukalhai", lon: 232.08, flavour: "Penetrating, piercing presence" },
  { name: "Toliman (Alpha Centauri)", lon: 239.48, flavour: "Lofty aims; strong friendships and loyalty" },
  { name: "Antares", lon: 249.76, flavour: "Royal star: intensity, courage, all-or-nothing" },
  { name: "Ras Alhague", lon: 262.45, flavour: "Healing and the urge to make things whole" },
  { name: "Vega", lon: 285.32, flavour: "Charisma, artistry and magnetic appeal" },
  { name: "Altair", lon: 301.78, flavour: "Boldness, daring and fast ambition" },
  { name: "Deneb Algedi", lon: 323.55, flavour: "Justice and the wisdom of the elder" },
  { name: "Fomalhaut", lon: 333.86, flavour: "Royal star: idealism, dreams and creative vision" },
  { name: "Deneb Adige", lon: 335.33, flavour: "Intelligence and a talent for the sciences or arts" },
  { name: "Achernar", lon: 345.31, flavour: "Success in public life; ideals made real" },
  { name: "Markab", lon: 353.48, flavour: "Spirit and determination; going your own way" },
  { name: "Scheat", lon: 359.37, flavour: "Independent thinking; ideas ahead of their time" },
];

export function fixedStars(c: NatalChart, orb = 1.5) {
  const years = (birthDate(c).getTime() - Date.UTC(2000, 0, 1, 12)) / (365.25 * DAY);
  const shift = (50.29 * years) / 3600;
  const pts = [
    ...c.planets.map(p => ({ name: p.name as string, lon: p.lon })),
    ...(c.angles ? c.angles.filter(a => a.name !== "Descendant").map(a => ({ name: a.name, lon: a.lon })) : []),
    { name: "North Node", lon: c.points[0].lon },
  ];
  const hits: { star: string; on: string; orb: string; orbDeg: number; starPosition: string; flavour: string }[] = [];
  for (const s of STARS) {
    const lon = norm360(s.lon + shift);
    for (const p of pts) {
      const d = angDist(lon, p.lon);
      if (d <= orb) hits.push({ star: s.name, on: p.name, orb: fmtOrb(d), orbDeg: round(d, 2), starPosition: fmtDeg(lon), flavour: s.flavour });
    }
  }
  return hits.sort((a, b) => a.orbDeg - b.orbDeg);
}

// ---------------- Eclipses and the Moon around birth ----------------
export function birthEclipses(c: NatalChart) {
  const birth = birthDate(c);
  const cusps = cuspsOf(c);
  const targets = natalTargets(c);
  const touch = (lon: number) => targets.filter(t => angDist(t.lon, lon) <= 3)
    .map(t => `${t.name} (${fmtOrb(angDist(t.lon, lon))})`);
  const describe = (date: Date, lon: number, kind: string) => ({
    date: dateOnly(date), kind, position: fmtDeg(lon),
    natalHouse: cusps ? houseOf(lon, cusps) : null, onNatal: touch(lon),
  });
  // Last lunar and solar eclipses before birth, and the first after
  let prenatalLunar: any = null, postnatalLunar: any = null;
  let le = A.SearchLunarEclipse(addDays(birth, -200));
  while (true) {
    const m = lonOf("Moon", le.peak.date);
    const item = describe(le.peak.date, m, `${le.kind} lunar eclipse`);
    if (le.peak.date < birth) prenatalLunar = item; else { postnatalLunar = item; break; }
    le = A.NextLunarEclipse(le.peak);
  }
  let prenatalSolar: any = null, postnatalSolar: any = null;
  let se = A.SearchGlobalSolarEclipse(addDays(birth, -200));
  while (true) {
    const s = lonOf("Sun", se.peak.date);
    const item = describe(se.peak.date, s, `${se.kind} solar eclipse`);
    if (se.peak.date < birth) prenatalSolar = item; else { postnatalSolar = item; break; }
    se = A.NextGlobalSolarEclipse(se.peak.date);
  }
  // Prenatal new moon and full moon
  const lastPhase = (phase: number) => {
    let t = addDays(birth, -32), last: Date | null = null;
    for (;;) {
      const r = A.SearchMoonPhase(phase, t, 40);
      if (!r || r.date >= birth) break;
      last = r.date; t = addDays(r.date, 5);
    }
    return last ? describe(last, lonOf("Moon", last), phase === 0 ? "New Moon" : "Full Moon") : null;
  };
  const daysTo = (d: string | undefined) => (d ? Math.round((new Date(d).getTime() - birth.getTime()) / DAY) : null);
  return {
    prenatalLunarEclipse: prenatalLunar, prenatalSolarEclipse: prenatalSolar,
    nextLunarEclipseAfterBirth: postnatalLunar ? { ...postnatalLunar, daysAfterBirth: daysTo(postnatalLunar.date) } : null,
    nextSolarEclipseAfterBirth: postnatalSolar ? { ...postnatalSolar, daysAfterBirth: daysTo(postnatalSolar.date) } : null,
    prenatalNewMoon: lastPhase(0), prenatalFullMoon: lastPhase(180),
  };
}

// ---------------- Natal retrogrades and progressed stations ----------------
/** For each planet retrograde (or about to station) at birth: when it turns by secondary progression. */
export function progressedStations(c: NatalChart, maxAge = 95) {
  const birth = birthDate(c).getTime();
  const out: { planet: string; natal: string; natalHouse: number | null; retrogradeAtBirth: boolean;
    turns: "direct" | "retrograde"; age: number; date: string }[] = [];
  for (const name of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as Planet[]) {
    const p = c.planets.find(x => x.name === name)!;
    let prev = speedOf(name, new Date(birth));
    for (let d = 1; d <= maxAge; d++) {
      const v = speedOf(name, new Date(birth + d * DAY));
      if (Math.sign(v) !== Math.sign(prev)) {
        const tx = bisect(t => speedOf(name, new Date(t)), birth + (d - 1) * DAY, birth + d * DAY);
        const ageYears = (tx - birth) / DAY; // one day after birth = one year of life
        out.push({
          planet: name, natal: p.position, natalHouse: p.house, retrogradeAtBirth: p.retrograde,
          turns: v > 0 ? "direct" : "retrograde", age: round(ageYears, 1),
          date: dateOnly(new Date(birth + ageYears * 365.2422 * DAY)),
        });
        if (!p.retrograde) break;
        prev = v;
        if (v > 0) break;
      }
      prev = v;
    }
  }
  return out;
}

/** When slow planets switched direction within a few days of birth */
export function stationsNearBirth(c: NatalChart, windowDays = 5) {
  const birth = birthDate(c).getTime();
  const out: { planet: string; station: string; daysFromBirth: number }[] = [];
  for (const name of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"] as Planet[]) {
    let prev = speedOf(name, new Date(birth - windowDays * DAY));
    for (let d = -windowDays + 0.25; d <= windowDays; d += 0.25) {
      const v = speedOf(name, new Date(birth + d * DAY));
      if (Math.sign(v) !== Math.sign(prev)) {
        const tx = bisect(t => speedOf(name, new Date(t)), birth + (d - 0.25) * DAY, birth + d * DAY);
        out.push({ planet: name, station: v > 0 ? "turned direct" : "turned retrograde", daysFromBirth: round((tx - birth) / DAY, 1) });
      }
      prev = v;
    }
  }
  return out;
}

// ---------------- Upcoming retrograde periods ----------------
export function upcomingRetrogrades(c: NatalChart, from: Date, months = 26) {
  const cusps = cuspsOf(c);
  const targets = natalTargets(c);
  const end = addDays(from, months * 30.44).getTime();
  const out: any[] = [];
  for (const body of ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"] as Planet[]) {
    // Start a little before `from` so a retrograde already under way is found
    let t = from.getTime() - 160 * DAY, prev = speedOf(body, new Date(t));
    let rxStart: number | null = null;
    for (t += DAY; t <= end + 160 * DAY; t += DAY) {
      const v = speedOf(body, new Date(t));
      if (Math.sign(v) !== Math.sign(prev)) {
        const tx = bisect(x => speedOf(body, new Date(x)), t - DAY, t);
        if (v < 0) rxStart = tx;
        else if (rxStart != null) {
          if (tx >= from.getTime() && rxStart <= end) {
            const l0 = lonOf(body, new Date(rxStart)), l1 = lonOf(body, new Date(tx));
            const span = norm360(l0 - l1); // retrograde moves backwards from l0 to l1
            const crossed = targets.filter(n => norm360(l0 - n.lon) <= span + 0.5).map(n => n.name);
            out.push({
              planet: body, start: dateOnly(new Date(rxStart)), end: dateOnly(new Date(tx)),
              underWay: rxStart < from.getTime(),
              from: fmtDeg(l0), to: fmtDeg(l1),
              houses: cusps ? [...new Set([houseOf(l0, cusps), houseOf(l1, cusps)])] : null,
              crossesNatal: crossed,
              stationsOn: [
                ...targets.filter(n => angDist(n.lon, l0) <= 2).map(n => `retrograde station on natal ${n.name}`),
                ...targets.filter(n => angDist(n.lon, l1) <= 2).map(n => `direct station on natal ${n.name}`),
              ],
            });
          }
          rxStart = null;
        }
      }
      prev = v;
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

// ---------------- Secondary progressions ----------------
export function progressions(c: NatalChart, now: Date, horizonYears = 16) {
  const birth = birthDate(c).getTime();
  const cusps = cuspsOf(c);
  const ageAt = (d: Date) => (d.getTime() - birth) / (365.2422 * DAY);
  const progDate = (age: number) => new Date(birth + age * DAY);
  const calDate = (age: number) => new Date(birth + age * 365.2422 * DAY);
  const age = ageAt(now);
  const pd = progDate(age);
  const natalSun = c.planets[0].lon;
  const at = (p: Planet) => {
    const lon = lonOf(p, pd);
    return { planet: `Progressed ${p}`, position: fmtDeg(lon), lon: round(lon, 3), house: cusps ? houseOf(lon, cusps) : null, retrograde: speedOf(p, pd) < 0 };
  };
  const pSun = lonOf("Sun", pd), pMoon = lonOf("Moon", pd);
  const phaseAngle = norm360(pMoon - pSun);
  const phaseNames = ["New", "Crescent", "First Quarter", "Gibbous", "Full", "Disseminating", "Last Quarter", "Balsamic"];
  const arc = norm360(pSun - natalSun);
  const solarArc = (name: string, lon: number) => {
    const l = norm360(lon + arc);
    return { point: `Solar arc ${name}`, position: fmtDeg(l), lon: round(l, 3), house: cusps ? houseOf(l, cusps) : null };
  };
  const mc = c.angles?.find(a => a.name === "Midheaven");
  const asc = c.angles?.find(a => a.name === "Ascendant");

  // Milestones: scan month by month
  const milestones: { date: string; age: number; event: string }[] = [];
  const targets = natalTargets(c).concat(c.angles ? c.angles.filter(a => a.name === "IC").map(a => ({ name: a.name, lon: a.lon, house: null })) : []);
  let prev: any = null;
  for (let m = -1; m <= horizonYears * 12; m++) {
    const a = age + m / 12;
    const d = progDate(a);
    const s = {
      sun: lonOf("Sun", d), moon: lonOf("Moon", d), venus: lonOf("Venus", d), mars: lonOf("Mars", d), mercury: lonOf("Mercury", d),
    };
    if (prev) {
      const when = dateOnly(calDate(a)), ag = round(a, 1);
      if (m >= 0) {
        if (Math.floor(s.moon / 30) !== Math.floor(prev.moon / 30)) milestones.push({ date: when, age: ag, event: `Progressed Moon enters ${signOf(s.moon)}` });
        if (cusps && houseOf(s.moon, cusps) !== houseOf(prev.moon, cusps)) milestones.push({ date: when, age: ag, event: `Progressed Moon enters your ${ordinal(houseOf(s.moon, cusps))} house (${HOUSE_THEMES[houseOf(s.moon, cusps)]})` });
        const e0 = norm360(prev.moon - prev.sun), e1 = norm360(s.moon - s.sun);
        if (e1 < e0) milestones.push({ date: when, age: ag, event: `Progressed New Moon in ${signOf(s.moon)}: a new 30-year cycle begins` });
        if (e0 < 180 && e1 >= 180) milestones.push({ date: when, age: ag, event: `Progressed Full Moon (Moon in ${signOf(s.moon)} opposite Sun in ${signOf(s.sun)}): culmination` });
        for (const [label, key] of [["Sun", "sun"], ["Venus", "venus"], ["Mars", "mars"], ["Mercury", "mercury"]] as const) {
          if (Math.floor(s[key] / 30) !== Math.floor(prev[key] / 30)) milestones.push({ date: when, age: ag, event: `Progressed ${label} enters ${signOf(s[key])}` });
          for (const t of targets) {
            if (`${t.name}` === label) continue;
            const f0 = wrap180(prev[key] - t.lon), f1 = wrap180(s[key] - t.lon);
            if (Math.abs(f0) < 5 && Math.sign(f0) !== Math.sign(f1)) milestones.push({ date: when, age: ag, event: `Progressed ${label} reaches your natal ${t.name}` });
          }
        }
      }
    }
    prev = s;
  }
  const stations = progressedStations(c).filter(s => s.date >= dateOnly(now)).map(s => ({ date: s.date, age: s.age, event: `${s.planet} turns ${s.turns} by progression` }));
  const all = [...milestones, ...stations].sort((a, b) => a.date.localeCompare(b.date));
  return {
    asOf: dateOnly(now), age: round(age, 1),
    sun: at("Sun"), moon: at("Moon"), mercury: at("Mercury"), venus: at("Venus"), mars: at("Mars"),
    lunarPhase: { phase: phaseNames[Math.floor(phaseAngle / 45)], angle: round(phaseAngle, 1) },
    solarArcMC: mc ? solarArc("MC", mc.lon) : null,
    solarArcAscendant: asc ? solarArc("Ascendant", asc.lon) : null,
    milestones: all.slice(0, 14),
  };
}

// ---------------- Human Design ----------------
// Gate order around the wheel, starting with Gate 41 at 2° Aquarius (302°)
const GATE_ORDER = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];
const CENTERS: Record<string, number[]> = {
  Head: [64, 61, 63], Ajna: [47, 24, 4, 17, 43, 11], Throat: [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
  G: [7, 1, 13, 10, 25, 15, 46, 2], Heart: [21, 40, 26, 51], Spleen: [48, 57, 44, 50, 32, 28, 18],
  Sacral: [5, 14, 29, 59, 9, 3, 42, 27, 34], "Solar Plexus": [36, 22, 37, 6, 49, 55, 30], Root: [53, 60, 52, 19, 39, 41, 58, 38, 54],
};
const CHANNELS: [number, number, string][] = [
  [64, 47, "Abstraction"], [61, 24, "Awareness"], [63, 4, "Logic"], [17, 62, "Acceptance"], [43, 23, "Structuring"], [11, 56, "Curiosity"],
  [16, 48, "The Wavelength"], [20, 57, "The Brainwave"], [20, 34, "Charisma"], [20, 10, "Awakening"], [31, 7, "The Alpha"], [8, 1, "Inspiration"],
  [33, 13, "The Prodigal"], [45, 21, "Money"], [35, 36, "Transitoriness"], [12, 22, "Openness"], [10, 34, "Exploration"], [10, 57, "Perfected Form"],
  [15, 5, "Rhythm"], [2, 14, "The Beat"], [46, 29, "Discovery"], [25, 51, "Initiation"], [26, 44, "Surrender"], [40, 37, "Community"],
  [34, 57, "Power"], [27, 50, "Preservation"], [59, 6, "Mating"], [42, 53, "Maturation"], [3, 60, "Mutation"], [9, 52, "Concentration"],
  [32, 54, "Transformation"], [28, 38, "Struggle"], [18, 58, "Judgment"], [19, 49, "Synthesis"], [39, 55, "Emoting"], [41, 30, "Recognition"],
];
const centerOf = (gate: number) => Object.keys(CENTERS).find(k => CENTERS[k].includes(gate))!;

function gateLine(lon: number) {
  const x = norm360(lon - 302);
  const idx = Math.floor(x / 5.625);
  const line = Math.floor((x - idx * 5.625) / 0.9375) + 1;
  return { gate: GATE_ORDER[idx], line };
}

function hdActivations(d: Date) {
  const sun = lonOf("Sun", d);
  const nn = trueNode(d);
  const bodies: [string, number][] = [
    ["Sun", sun], ["Earth", norm360(sun + 180)], ["North Node", nn], ["South Node", norm360(nn + 180)],
    ...PLANETS.filter(p => p !== "Sun").map(p => [p, lonOf(p, d)] as [string, number]),
  ];
  return bodies.map(([body, lon]) => ({ body, ...gateLine(lon) }));
}

export function humanDesign(c: NatalChart) {
  if (!c.birth.timeKnown) return null;
  const birth = birthDate(c);
  const natalSun = lonOf("Sun", birth);
  const target = norm360(natalSun - 88);
  const t0 = birth.getTime() - 95 * DAY, t1 = birth.getTime() - 82 * DAY;
  const designMs = bisect(t => wrap180(lonOf("Sun", new Date(t)) - target), t0, t1);
  const design = new Date(designMs);
  const personality = hdActivations(birth), des = hdActivations(design);
  const gates = new Set([...personality, ...des].map(a => a.gate));
  const channels = CHANNELS.filter(([a, b]) => gates.has(a) && gates.has(b))
    .map(([a, b, name]) => ({ channel: `${a}-${b}`, name, centers: [centerOf(a), centerOf(b)] }));
  const defined = new Set(channels.flatMap(ch => ch.centers));
  // Connected groups of defined centres
  const adj = new Map<string, Set<string>>();
  for (const ch of channels) {
    const [x, y] = ch.centers;
    (adj.get(x) ?? adj.set(x, new Set()).get(x)!).add(y);
    (adj.get(y) ?? adj.set(y, new Set()).get(y)!).add(x);
  }
  const groups: string[][] = []; const seen = new Set<string>();
  for (const k of defined) {
    if (seen.has(k)) continue;
    const st = [k], g: string[] = [];
    while (st.length) { const x = st.pop()!; if (seen.has(x)) continue; seen.add(x); g.push(x); adj.get(x)?.forEach(y => st.push(y)); }
    groups.push(g);
  }
  const groupOf = (center: string) => groups.find(g => g.includes(center));
  const motorToThroat = defined.has("Throat") && ["Sacral", "Solar Plexus", "Heart", "Root"].some(m => defined.has(m) && groupOf(m)?.includes("Throat"));
  const type = defined.size === 0 ? "Reflector"
    : defined.has("Sacral") ? (motorToThroat ? "Manifesting Generator" : "Generator")
    : motorToThroat ? "Manifestor" : "Projector";
  const strategy: Record<string, string> = {
    Generator: "Wait to respond", "Manifesting Generator": "Wait to respond, then inform",
    Manifestor: "Inform before you act", Projector: "Wait for the invitation", Reflector: "Wait a lunar cycle",
  };
  const signature: Record<string, string> = {
    Generator: "Satisfaction / frustration", "Manifesting Generator": "Satisfaction & peace / frustration & anger",
    Manifestor: "Peace / anger", Projector: "Success / bitterness", Reflector: "Surprise / disappointment",
  };
  const authority = defined.has("Solar Plexus") ? "Emotional (Solar Plexus)"
    : defined.has("Sacral") ? "Sacral"
    : defined.has("Spleen") ? "Splenic"
    : defined.has("Heart") ? (groupOf("Heart")?.includes("Throat") ? "Ego (Manifested)" : "Ego (Projected)")
    : defined.has("G") ? "Self-projected"
    : type === "Reflector" ? "Lunar" : "Mental (no inner authority)";
  const definition = ["None", "Single", "Split", "Triple split", "Quadruple split"][Math.min(groups.length, 4)];
  const pSun = personality[0], dSun = des[0];
  const profile = `${pSun.line}/${dSun.line}`;
  const PROFILE_NAMES: Record<number, string> = { 1: "Investigator", 2: "Hermit", 3: "Martyr", 4: "Opportunist", 5: "Heretic", 6: "Role Model" };
  const angle = profile === "4/1" ? "Juxtaposition" : pSun.line >= 5 ? "Left Angle" : "Right Angle";
  const cross = `${angle} Cross (${pSun.gate}/${personality[1].gate} | ${dSun.gate}/${des[1].gate})`;
  return {
    designDate: dateOnly(design),
    type, strategy: strategy[type], authority, profile: `${profile} — ${PROFILE_NAMES[pSun.line]} / ${PROFILE_NAMES[dSun.line]}`,
    definition, incarnationCross: cross,
    definedCenters: Object.keys(CENTERS).filter(k => defined.has(k)),
    openCenters: Object.keys(CENTERS).filter(k => !defined.has(k)),
    channels: channels.map(ch => `${ch.channel} ${ch.name}`),
    signature: signature[type],
    personality: personality.map(a => `${a.body} ${a.gate}.${a.line}`),
    design: des.map(a => `${a.body} ${a.gate}.${a.line}`),
  };
}

// ---------------- Numerology ----------------
// Same conventions as the free results (see lib/numerology.ts)
export function numerology(birthDateStr: string, years: number[]) {
  const lp = lifePath(birthDateStr);
  return {
    lifePath: { number: lp.value, display: lp.display, working: lp.working },
    birthday: birthdayNumber(birthDateStr).display,
    personalYears: years.map(y => ({ year: y, number: personalYear(birthDateStr, y).value })),
  };
}

// ---------------- Declinations: parallels and contra-parallels ----------------
export function parallels(c: NatalChart, orb = 1) {
  const out: { a: string; b: string; kind: "parallel" | "contra-parallel"; orb: number }[] = [];
  const ps = c.planets;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const x = ps[i].declination, y = ps[j].declination;
    if (Math.abs(x - y) <= orb) out.push({ a: ps[i].name, b: ps[j].name, kind: "parallel", orb: round(Math.abs(x - y), 2) });
    else if (Math.abs(x + y) <= orb) out.push({ a: ps[i].name, b: ps[j].name, kind: "contra-parallel", orb: round(Math.abs(x + y), 2) });
  }
  return out.sort((a, b) => a.orb - b.orb);
}

export { SIGNS };

export const ordinal = (n: number) => n + (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");
