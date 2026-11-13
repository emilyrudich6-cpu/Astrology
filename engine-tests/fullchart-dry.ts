import { fullChartReading } from "../lib/fullchart";
process.env.READINGS_DRY_RUN = "1";
(async () => {
  const t = Date.now();
  const r = await fullChartReading({ name: "Emily", date: "1995-10-06", time: "10:00", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437, place: "Los Angeles, California" }, new Date("2026-11-13T22:00:00Z"));
  const d = JSON.parse(r.body);
  require("fs").writeFileSync("/tmp/fullchart.json", JSON.stringify(d, null, 1));
  console.log("ms", Date.now() - t, "bytes", r.body.length);
  console.log(JSON.stringify({ header: d.calc.header, glance: d.calc.glance, planets: d.calc.planetRows, houses: d.calc.houseRows?.slice(0, 3), aspects: d.calc.aspectRows.slice(0, 6), retros: d.calc.natalRetros, timeline: d.calc.timelineRows }, null, 1));
})();
