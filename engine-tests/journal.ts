import { cleanEntry } from "../lib/journal";
let f = 0; const eq = (l: string, g: any, w: any) => { const ok = JSON.stringify(g) === JSON.stringify(w); if (!ok) f++; console.log(`${ok ? "ok  " : "FAIL"} ${l}: ${JSON.stringify(g)}${ok ? "" : ` want ${JSON.stringify(w)}`}`); };
const v = (b: any) => { const r = cleanEntry(b); return r.ok ? r.value : r.error; };
// Backdated entry keeps its own local date
const back = v({ number: "12:12", seenLocal: "2026-10-02T12:12", tz: "America/Los_Angeles", note: "right before I called my boss" }) as any;
eq("backdated local date", back.seen_local_date, "2026-10-02");
eq("backdated UTC instant", back.seen_at, "2026-10-02T19:12:00.000Z");
eq("normalized + raw kept", [back.number_raw, back.number_norm], ["12:12", "1212"]);
// 11:58 PM in Los Angeles is already the next day in UTC; the local date must stay
const late = v({ number: "444", seenLocal: "2026-11-13T23:58", tz: "America/Los_Angeles" }) as any;
eq("near midnight keeps local date", [late.seen_local_date, late.seen_at.slice(0, 10)], ["2026-11-13", "2026-11-14"]);
const early = v({ number: "444", seenLocal: "2026-11-14T00:02", tz: "Asia/Tokyo" }) as any;
eq("just after midnight in Tokyo keeps local date", [early.seen_local_date, early.seen_at.slice(0, 16)], ["2026-11-14", "2026-11-13T15:02"]);
// Logged later from another time zone: the sighting date stays as entered
const travel = v({ number: "1111", seenLocal: "2026-11-01T08:00", tz: "Europe/London" }) as any;
eq("logged later, different zone", travel.seen_local_date, "2026-11-01");
eq("empty note becomes null", v({ number: "1", seenLocal: "2026-11-01T08:00", tz: "UTC", note: "   " }) && (v({ number: "1", seenLocal: "2026-11-01T08:00", tz: "UTC", note: "   " }) as any).note, null);
eq("future rejected", typeof v({ number: "1", seenLocal: "2099-01-01T08:00", tz: "UTC" }), "string");
eq("bad zone rejected", typeof v({ number: "1", seenLocal: "2026-11-01T08:00", tz: "Mars/Olympus" }), "string");
eq("letters rejected", typeof v({ number: "abc", seenLocal: "2026-11-01T08:00", tz: "UTC" }), "string");
process.exit(f ? 1 : 0);
