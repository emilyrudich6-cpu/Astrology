import { synastryDocReading } from "../lib/synastry-doc";
process.env.READINGS_DRY_RUN = "1";
const LA = { timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437, place: "Los Angeles, California" };
(async () => {
  const r = await synastryDocReading({ name: "Emily", date: "1995-10-06", time: "10:00", ...LA }, { name: "Matt", date: "1981-10-14", time: "23:54", ...LA }, "partner", new Date("2026-11-09T22:00:00Z"));
  const d = JSON.parse(r.body);
  require("fs").writeFileSync("/tmp/synastry.json", JSON.stringify(d, null, 1));
  const c = d.calc;
  console.log(JSON.stringify(c.header, null, 1));
  for (const x of c.aInB) console.log("A>", x.planet, x.where);
  for (const x of c.bInA) console.log("B>", x.planet, x.where);
  for (const x of c.aspects) console.log(x.id, x.aspect, x.orb);
  console.log(JSON.stringify(c.retro));
  for (const k of c.keyDates) console.log(k.id, k.date, k.sky, JSON.stringify(k.touches));
})();
