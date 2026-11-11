// Core astronomy: positions, speeds, declinations, houses, special points.
// Uses astronomy-engine (MIT licence, safe for commercial use).
// All longitudes are tropical, geocentric, true ecliptic of date, in degrees.
import * as A from "astronomy-engine";

export const PLANETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
] as const;
export type Planet = (typeof PLANETS)[number];

export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;
export type Sign = (typeof SIGNS)[number];

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export const norm360 = (x: number) => ((x % 360) + 360) % 360;
/** Wrap to (-180, 180] */
export const wrap180 = (x: number) => {
  const y = norm360(x);
  return y > 180 ? y - 360 : y;
};
/** Smallest angular distance 0..180 */
export const angDist = (a: number, b: number) => Math.abs(wrap180(a - b));

export const signOf = (lon: number): Sign => SIGNS[Math.floor(norm360(lon) / 30)];
export const signIndex = (lon: number) => Math.floor(norm360(lon) / 30);
export const degInSign = (lon: number) => norm360(lon) % 30;

export function fmtDeg(lon: number): string {
  const d = degInSign(lon);
  let deg = Math.floor(d);
  let min = Math.round((d - deg) * 60);
  if (min === 60) { deg += 1; min = 0; }
  return `${deg}°${String(min).padStart(2, "0")}' ${signOf(lon)}`;
}

const BODY: Record<Planet, A.Body> = {
  Sun: A.Body.Sun, Moon: A.Body.Moon, Mercury: A.Body.Mercury, Venus: A.Body.Venus,
  Mars: A.Body.Mars, Jupiter: A.Body.Jupiter, Saturn: A.Body.Saturn,
  Uranus: A.Body.Uranus, Neptune: A.Body.Neptune, Pluto: A.Body.Pluto,
};

/** Ecliptic longitude & latitude (degrees) of a planet at a UTC Date */
export function eclipticOf(p: Planet, date: Date): { lon: number; lat: number } {
  if (p === "Moon") {
    const m = A.EclipticGeoMoon(date);
    return { lon: norm360(m.lon), lat: m.lat };
  }
  const v = A.GeoVector(BODY[p], date, true);
  const e = A.Ecliptic(v);
  return { lon: norm360(e.elon), lat: e.elat };
}

export const lonOf = (p: Planet, date: Date) => eclipticOf(p, date).lon;

const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86400000);

/** Daily motion in degrees/day (negative = retrograde) */
export function speedOf(p: Planet, date: Date): number {
  const h = p === "Moon" ? 0.05 : 0.25;
  const a = lonOf(p, addDays(date, -h));
  const b = lonOf(p, addDays(date, h));
  return wrap180(b - a) / (2 * h);
}

export function obliquity(date: Date): number {
  return A.e_tilt(A.MakeTime(date)).tobl; // true obliquity, degrees
}

/** Geocentric declination from ecliptic coordinates */
export function declination(lon: number, lat: number, eps: number): number {
  const s = Math.sin(lat * D2R) * Math.cos(eps * D2R) +
    Math.cos(lat * D2R) * Math.sin(eps * D2R) * Math.sin(lon * D2R);
  return Math.asin(s) * R2D;
}

/** Julian centuries (TT) since J2000 */
const centuriesTT = (date: Date) => A.MakeTime(date).tt / 36525;

/** Mean lunar node (Meeus 47.7) */
export function meanNode(date: Date): number {
  const T = centuriesTT(date);
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T * T +
    (T * T * T) / 467441 - (T * T * T * T) / 60616000);
}

/** True (osculating) lunar node from the Moon's state vector */
export function trueNode(date: Date): number {
  const s = A.GeoMoonState(date);
  const rot = A.Rotation_EQJ_ECT(date);
  const t = A.MakeTime(date);
  const r = A.RotateVector(rot, new A.Vector(s.x, s.y, s.z, t));
  const v = A.RotateVector(rot, new A.Vector(s.vx, s.vy, s.vz, t));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return norm360(Math.atan2(hx, -hy) * R2D);
}

/** Mean Black Moon Lilith = mean lunar apogee (Meeus 47.7, perigee + 180) */
export function meanLilith(date: Date): number {
  const T = centuriesTT(date);
  const perigee = 83.3532465 + 4069.0137287 * T - 0.01032 * T * T -
    (T * T * T) / 80053 + (T * T * T * T) / 18999000;
  // The apogee lies on the Moon's orbit (inclined ~5.145° to the ecliptic):
  // project it onto the ecliptic, as Swiss Ephemeris does.
  const apogee = perigee + 180;
  const node = meanNode(date);
  const u = (apogee - node) * D2R;
  const inc = 5.1453964 * D2R;
  return norm360(node + Math.atan2(Math.sin(u) * Math.cos(inc), Math.cos(u)) * R2D);
}

// ---------------- Houses ----------------

export interface Houses {
  system: "Placidus" | "Porphyry";
  cusps: number[]; // 12 cusps, index 0 = house 1
  asc: number;
  mc: number;
  armc: number;
  note?: string;
}

function ascendant(armc: number, eps: number, lat: number): number {
  const r = armc * D2R, e = eps * D2R, f = lat * D2R;
  return norm360(Math.atan2(Math.cos(r), -(Math.sin(r) * Math.cos(e) + Math.tan(f) * Math.sin(e))) * R2D);
}
function midheaven(armc: number, eps: number): number {
  const r = armc * D2R, e = eps * D2R;
  return norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
}
/** ecliptic longitude of the point on the ecliptic with right ascension ra */
function raToLon(ra: number, eps: number): number {
  const r = ra * D2R, e = eps * D2R;
  return norm360(Math.atan2(Math.sin(r), Math.cos(r) * Math.cos(e)) * R2D);
}

function placidusCusp(armc: number, eps: number, lat: number, frac: number, above: boolean): number | null {
  // above: houses 11/12 (frac of diurnal semi-arc east of MC)
  // below: houses 2/3   (measured back from IC by frac of nocturnal semi-arc)
  const e = eps * D2R, f = lat * D2R;
  let lon = above ? raToLon(armc + 90 * frac * 2 / 1.5, eps) : raToLon(armc + 180 - 90 * frac, eps);
  for (let i = 0; i < 100; i++) {
    const dec = Math.asin(Math.sin(e) * Math.sin(lon * D2R));
    const x = -Math.tan(f) * Math.tan(dec);
    if (Math.abs(x) > 1) return null;
    const dsa = Math.acos(x) * R2D; // diurnal semi-arc
    const nsa = 180 - dsa;
    const ra = above ? armc + frac * dsa : armc + 180 - frac * nsa;
    const next = raToLon(ra, eps);
    if (angDist(next, lon) < 1e-9) { lon = next; break; }
    lon = next;
  }
  return lon;
}

export function computeHouses(date: Date, latitude: number, longitude: number): Houses {
  const eps = obliquity(date);
  const armc = norm360(A.SiderealTime(date) * 15 + longitude);
  const asc = ascendant(armc, eps, latitude);
  const mc = midheaven(armc, eps);
  const c11 = placidusCusp(armc, eps, latitude, 1 / 3, true);
  const c12 = placidusCusp(armc, eps, latitude, 2 / 3, true);
  const c2 = placidusCusp(armc, eps, latitude, 2 / 3, false);
  const c3 = placidusCusp(armc, eps, latitude, 1 / 3, false);
  if (c11 == null || c12 == null || c2 == null || c3 == null) {
    // Polar latitudes: Placidus is undefined. Fall back to Porphyry.
    const ic = norm360(mc + 180);
    const q1 = norm360(asc - mc) / 3; // MC -> ASC
    const q2 = norm360(ic - asc) / 3; // ASC -> IC
    const cusps = [asc, asc + q2, asc + 2 * q2, ic, ic + q1, ic + 2 * q1,
      asc + 180, asc + 180 + q2, asc + 180 + 2 * q2, mc, mc + q1, mc + 2 * q1].map(norm360);
    return { system: "Porphyry", cusps, asc, mc, armc,
      note: "Placidus houses don't exist at this latitude; Porphyry used instead." };
  }
  const cusps = [asc, c2, c3, norm360(mc + 180), norm360(c11 + 180), norm360(c12 + 180),
    norm360(asc + 180), norm360(c2 + 180), norm360(c3 + 180), mc, c11, c12];
  return { system: "Placidus", cusps, asc, mc, armc };
}

/** Which house (1-12) a longitude falls in for a given cusp set */
export function houseOf(lon: number, cusps: number[]): number {
  for (let i = 0; i < 12; i++) {
    const start = cusps[i];
    const end = cusps[(i + 1) % 12];
    const span = norm360(end - start);
    if (norm360(lon - start) < span) return i + 1;
  }
  return 12;
}

export function wholeSignHouseOf(lon: number, asc: number): number {
  return ((signIndex(lon) - signIndex(asc) + 12) % 12) + 1;
}
