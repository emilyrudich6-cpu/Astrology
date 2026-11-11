import { natalChart } from "../lib/engine/natal";
import { dominantPlanet, uncertainPlacements, timelineSample } from "../lib/engine/dominant";
const charts = [
  { name: "Ava", date: "1990-06-15", time: "14:30", timezone: "America/Los_Angeles", latitude: 34.05, longitude: -118.24 },
  { name: "NoTime", date: "1995-03-21", time: null, timezone: "America/New_York", latitude: 40.7, longitude: -74 },
];
for (const b of charts) {
  const c = natalChart(b as any);
  const t = Date.now();
  console.log(b.name, JSON.stringify(dominantPlanet(c), null, 1));
  console.log("uncertain:", uncertainPlacements(b as any));
  console.log("work:", timelineSample(c, "work"), "growth:", timelineSample(c, "growth"), Date.now() - t, "ms");
}
