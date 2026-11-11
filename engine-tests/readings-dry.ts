import { natalReading, monthlyTimeline, questionAnswer, synastryReading } from "../lib/readings";
const a = { name: "Ava", date: "1990-06-15", time: "14:30", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 };
const b = { name: "Ben", date: "1988-11-02", time: null, timezone: "America/New_York", latitude: 40.7128, longitude: -74.006 };
(async () => {
  for (const [n, f] of [["natal", () => natalReading(a)], ["timeline", () => monthlyTimeline(a)], ["question", () => questionAnswer(a, "love", "When is my next big romantic window?")], ["synastry", () => synastryReading(a, b, "dating")]] as const) {
    const t = Date.now(); const r: any = await (f as any)(); console.log(n, Date.now() - t, "ms", r.body);
  }
})();
