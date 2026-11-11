import { PLANETS, eclipticOf, speedOf, obliquity, declination, meanNode, trueNode, meanLilith, computeHouses } from "../lib/engine/core";
// deterministic pseudo-random charts 1900-2030, latitudes -60..65
let seed = 12345; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
const out: any[] = [];
for (let i = 0; i < 300; i++) {
  const ms = Date.UTC(1900, 0, 1) + rnd() * (Date.UTC(2030, 0, 1) - Date.UTC(1900, 0, 1));
  const d = new Date(Math.round(ms / 60000) * 60000);
  const lat = -60 + rnd() * 125, lon = -180 + rnd() * 360;
  const eps = obliquity(d);
  const pl: any = {};
  for (const p of PLANETS) { const e = eclipticOf(p, d); pl[p] = { lon: e.lon, dec: declination(e.lon, e.lat, eps), speed: speedOf(p, d) }; }
  const h = computeHouses(d, lat, lon);
  out.push({ iso: d.toISOString(), lat, lon, pl, meanNode: meanNode(d), trueNode: trueNode(d), lilith: meanLilith(d), houses: h });
}
console.log(JSON.stringify(out));
