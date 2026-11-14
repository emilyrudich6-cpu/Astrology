import { buildRecap } from "../lib/journal-recap";
const emily = { name: "Emily", date: "1995-10-06", time: "10:00", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 };
const mk = (i: number, raw: string, norm: string, day: string, note: string | null) => ({ id: `e${i}`, number_raw: raw, number_norm: norm, seen_at: `${day}T20:00:00Z`, seen_local_date: day, seen_local_time: "12:12", note });
const r = buildRecap([
  mk(1, "12:12", "1212", "2026-11-02", "right before I called my boss"),
  mk(2, "1212", "1212", "2026-11-05", "deciding whether to take the new job"),
  mk(3, "12:12", "1212", "2026-11-09", "meeting with a client about work"),
  mk(4, "12:12", "1212", "2026-11-12", "thinking about my mom"),
  mk(5, "444", "444", "2026-11-13", null),
], emily);
console.log(r.recurring.map(g => g.sentence));
console.log(r.themes.map(t => `${t.label}:${t.ids.length}`).join(", "));
console.log(r.rows.map(x => `${x.number_raw} ${x.seen_local_date} -> ${x.transit}`).join("\n"));
