import { natalChart } from "../lib/engine/natal";
import { fixedStars, birthEclipses, progressedStations, stationsNearBirth, upcomingRetrogrades, progressions, humanDesign, numerology, parallels } from "../lib/engine/extras";
const emily = natalChart({ name: "Emily", date: "1995-10-06", time: "10:00", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 });
const now = new Date("2026-11-09T20:00:00Z");
const out = {
  stars: fixedStars(emily), eclipses: birthEclipses(emily), progStations: progressedStations(emily), nearBirth: stationsNearBirth(emily),
  retros: upcomingRetrogrades(emily, now), prog: progressions(emily, now), hd: humanDesign(emily), num: numerology("1995-10-06", [2026, 2027, 2028]),
  par: parallels(emily),
};
console.log(JSON.stringify(out, null, 1));
