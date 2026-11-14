import { compareEntry } from "../lib/journal-compare";
const emily = { name: "Emily", date: "1995-10-06", time: "10:00", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 };
const r = compareEntry({ number_norm: "1212", note: "I saw 12:12 right before I called my boss", seen_at: "2026-11-10T20:12:00Z" }, emily);
console.log(JSON.stringify({ themes: r.themes, overlap: r.overlap, question: r.question, transits: r.transits.map(t => [t.label, t.orb, t.from, t.to, t.exact, t.overlaps]) }, null, 1));
const none = compareEntry({ number_norm: "4172", note: null, seen_at: "2026-11-10T20:12:00Z" }, null);
console.log("no chart:", none.chartMissing, none.question, none.transits.length);
