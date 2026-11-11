// Offline birthplace search: GeoNames cities (CC-BY, via all-the-cities) + coordinate -> time zone lookup.
// No API key or paid service needed.
import cities from "all-the-cities";
import tzlookup from "tz-lookup";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const countryName = new Intl.DisplayNames(["en"], { type: "region" });

type City = { name: string; key: string; country: string; admin: string; pop: number; lat: number; lon: number };
let index: City[] | null = null;
function load(): City[] {
  if (index) return index;
  index = (cities as any[]).map(c => ({
    name: c.name, key: fold(c.name), country: c.country, admin: c.adminCode, pop: c.population,
    lat: c.loc.coordinates[1], lon: c.loc.coordinates[0],
  })).sort((a, b) => b.pop - a.pop);
  return index;
}

export interface Place { label: string; latitude: number; longitude: number; timezone: string }

export function searchPlaces(q: string, limit = 8): Place[] {
  const [cityPart, ...rest] = q.split(",");
  const needle = fold(cityPart);
  const hint = fold(rest.join(" "));
  if (needle.length < 2) return [];
  const out: Place[] = [];
  for (const c of load()) {
    if (!c.key.startsWith(needle)) continue;
    let country = c.country;
    try { country = countryName.of(c.country) ?? c.country; } catch {}
    const admin = c.country === "US" ? c.admin : "";
    const label = [c.name, admin, country].filter(Boolean).join(", ");
    if (hint && !fold(label).includes(hint)) continue;
    out.push({ label, latitude: c.lat, longitude: c.lon, timezone: tzlookup(c.lat, c.lon) });
    if (out.length >= limit) break;
  }
  return out;
}
