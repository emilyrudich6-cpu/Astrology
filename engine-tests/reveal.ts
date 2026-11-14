// Chart reveal checks. Run: npx tsx engine-tests/reveal.ts
import { revealInsight, firstSentence } from "../lib/reveal";
import { natalChart } from "../lib/engine/natal";
import { freeChart } from "../lib/freechart-server";
import { encodeBirth } from "../lib/freechart";
let f = 0; const ok = (l: string, c: boolean, g?: unknown) => { if (!c) f++; console.log(`${c ? "ok  " : "FAIL"} ${l}${g !== undefined ? `: ${JSON.stringify(g)}` : ""}`); };
const mk = (date: string, time: string | null) => natalChart({ name: "x", date, time: time ?? undefined, timezone: "America/Los_Angeles", latitude: 34.05, longitude: -118.24 } as any);

// Sun-Moon conjunction (new Moon): Nov 9 2023 ~ new Moon Nov 13 2023
const nm = mk("2023-11-13", "01:30");
const i1 = revealInsight(nm, false);
ok("new Moon birth reads as a conjunction", !!i1 && /line up/.test(i1.title), i1?.title);
// Full Moon: Nov 27 2023
const fm = mk("2023-11-27", "01:30");
const i2 = revealInsight(fm, false);
ok("full Moon birth reads as an opposition", !!i2 && /full Moon/.test(i2.title), i2?.title);
// Every insight names the actual signs or the aspect it's based on
for (const d of ["1995-10-06", "1988-02-14", "2001-07-30", "1979-12-02"]) {
  const c = mk(d, "12:00"); const ins = revealInsight(c, false)!;
  const sun = c.planets.find(p => p.name === "Sun")!.sign;
  ok(`${d}: insight grounded in the chart`, !!ins && (ins.text.includes(sun) || ins.basis.includes("Sun")), ins?.basis);
}
// Moon uncertain: falls back to the strongest planet
const fb = revealInsight(mk("1995-10-06", null), true, { planet: "Venus", sign: "Scorpio" });
ok("uncertain Moon uses the strongest planet", !!fb && fb.title.startsWith("Venus in Scorpio"), fb?.title);
ok("no fallback data -> no insight rather than a made-up one", revealInsight(mk("1995-10-06", null), true, null) === null);
ok("first sentence", firstSentence("A Taurus Sun builds a life you can touch. You trust what lasts.") === "A Taurus Sun builds a life you can touch.");
// Unknown time: no Rising
const unk = freeChart(encodeBirth({ d: "1995-10-06", t: null, p: "Los Angeles", tz: "America/Los_Angeles", la: 34.05, lo: -118.24 }));
ok("unknown time has no angles (no Rising)", !!unk && !unk.chart.angles);
console.log("tokens: known", encodeBirth({ n: "Ava", d: "1995-10-06", t: "10:00", p: "Los Angeles, CA", tz: "America/Los_Angeles", la: 34.05, lo: -118.24 }), "unknown", encodeBirth({ n: "Ava", d: "1995-10-06", t: null, p: "Los Angeles, CA", tz: "America/Los_Angeles", la: 34.05, lo: -118.24 }), "uncertainMoon", encodeBirth({ d: "1993-04-19", t: null, p: "Portland, OR", tz: "America/Los_Angeles", la: 45.5, lo: -122.7 }));
console.log(f ? `\n${f} failed` : "\nall reveal checks passed"); process.exit(f ? 1 : 0);
