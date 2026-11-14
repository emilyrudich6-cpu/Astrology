// Phase 2 checks: Compare with my timeline and the monthly recap. Run: npx tsx engine-tests/phase2.ts
import { compareEntry, THEMES } from "../lib/journal-compare";
import { buildRecap } from "../lib/journal-recap";
import { cleanEntry } from "../lib/journal";
import { GENERAL_QUESTION } from "../lib/seeing-numbers";

let fails = 0;
const ok = (label: string, cond: boolean, got?: unknown) => { if (!cond) fails++; console.log(`${cond ? "ok  " : "FAIL"} ${label}${got !== undefined ? `: ${JSON.stringify(got)}` : ""}`); };
const emily = { name: "Emily", date: "1995-10-06", time: "10:00", timezone: "America/Los_Angeles", latitude: 34.0522, longitude: -118.2437 };
const q = (key: string) => THEMES.find(t => t.key === key)!.question;
const day = (s: string) => new Date(s + "T12:00:00Z").getTime();

// The brief's own example
const boss = compareEntry({ number_norm: "1212", note: "I saw 12:12 right before I called my boss", seen_at: "2026-11-10T20:12:00Z" }, emily);
ok("example: note read as a conversation and work", boss.themes.map(t => t.key).join() === "conversation,work", boss.themes.map(t => t.key));
ok("example: one or two transits", boss.transits.length >= 1 && boss.transits.length <= 2, boss.transits.map(t => t.label));
ok("example: Mercury involved in the overlap", !!boss.overlap && /Mercury/.test(boss.overlap.transit), boss.overlap);
ok("example: asks what you wanted to say", boss.question === q("conversation"));
ok("example: number meaning still shown", !!boss.meaning?.meaning);
for (const t of boss.transits) ok(`window covers the day seen (${t.label})`, !!t.from && !!t.to && day("2026-11-10") >= day(new Date(t.from + " UTC").toISOString().slice(0, 10)) && day("2026-11-10") <= day(new Date(t.to + " UTC").toISOString().slice(0, 10)), [t.from, t.to]);

// Backdated entry: the comparison uses the day it was seen, not the day it was saved
const march = compareEntry({ number_norm: "444", note: null, seen_at: "2026-03-01T17:00:00Z" }, emily);
const nov = compareEntry({ number_norm: "444", note: null, seen_at: "2026-11-10T17:00:00Z" }, emily);
ok("backdated entry gets that day's sky", JSON.stringify(march.transits.map(t => t.label)) !== JSON.stringify(nov.transits.map(t => t.label)), [march.transits.map(t => t.label), nov.transits.map(t => t.label)]);

// No birth details: entry and number reading still work
const nochart = compareEntry({ number_norm: "4172", note: null, seen_at: "2026-11-10T20:12:00Z" }, null);
ok("no chart: still usable", nochart.chartMissing && nochart.transits.length === 0 && nochart.question === GENERAL_QUESTION);
const nochartNote = compareEntry({ number_norm: "333", note: "Thinking about my mom", seen_at: "2026-11-10T20:12:00Z" }, null);
ok("no chart: question still comes from the note", nochartNote.question === q("family"), nochartNote.question);
ok("no chart: number meaning kept", !!nochartNote.meaning);

// A note with a theme always gets a question about that theme, whatever the sky shows
const mom = compareEntry({ number_norm: "333", note: "Thinking about my mom", seen_at: "2026-11-10T20:12:00Z" }, emily);
ok("question grounded in the note", mom.question === q("family"), mom.question);

// Near midnight: 11:58 pm on Oct 31 in LA is Nov 1 in UTC, but stays Oct 31 in the journal and the recap
const late = cleanEntry({ number: "11:11", seenLocal: "2026-10-31T23:58", tz: "America/Los_Angeles", note: "" });
ok("near midnight keeps the local date", late.ok && late.value.seen_local_date === "2026-10-31" && late.value.seen_at.startsWith("2026-11-01T06:58"), late.ok ? [late.value.seen_local_date, late.value.seen_at] : late);
const early = cleanEntry({ number: "1:11", seenLocal: "2026-11-01T00:03", tz: "Asia/Tokyo", note: "" });
ok("just after midnight in Tokyo keeps Nov 1", early.ok && early.value.seen_local_date === "2026-11-01" && early.value.seen_at.startsWith("2026-10-31T15:03"), early.ok ? [early.value.seen_local_date, early.value.seen_at] : early);
const inOctober = (d: string) => d >= "2026-10-01" && d < "2026-11-01"; // the recap page's month filter
ok("the 11:58 pm entry lands in October's recap", late.ok && inOctober(late.value.seen_local_date));
const lateCmp = late.ok ? compareEntry(late.value, emily) : null;
ok("near-midnight entry still compares", !!lateCmp && lateCmp.transits.length > 0, lateCmp?.transits.map(t => t.label));

// Recap sentences come only from the entries
const E = (id: string, raw: string, norm: string, date: string, note: string | null) =>
  ({ id, number_raw: raw, number_norm: norm, seen_at: `${date}T20:00:00Z`, seen_local_date: date, seen_local_time: "12:12", note });
const month = [
  E("a", "12:12", "1212", "2026-11-03", "Work decision about the launch"),
  E("b", "12:12", "1212", "2026-11-09", "Right before a meeting with my boss"),
  E("c", "1212", "1212", "2026-11-14", "Should I quit my job?"),
  E("d", "12:12", "1212", "2026-11-20", "Grocery run"),
  E("e", "444", "444", "2026-11-21", null),
];
const r = buildRecap(month, emily);
ok("recap counts 12:12 and 1212 together", r.recurring[0]?.ids.length === 4, r.recurring[0]?.sentence);
ok("recap sentence matches the brief's style", r.recurring[0]?.sentence === "You logged 12:12 four times this month. Three entries mention work.", r.recurring[0]?.sentence);
ok("single sightings aren't called recurring", !r.recurring.some(g => g.number === "444"));
ok("each row links an entry and, with a chart, its transit", r.rows.length === 5 && r.rows.every(x => typeof x.transit === "string"));
const r2 = buildRecap(month, null);
ok("recap works without a chart", r2.recurring.length === 1 && r2.rows.every(x => x.transit === null));
ok("empty month", buildRecap([], emily).recurring.length === 0);

console.log(fails ? `\n${fails} failed` : "\nall Phase 2 checks passed");
process.exit(fails ? 1 : 0);
