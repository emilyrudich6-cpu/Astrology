// What "Your readings" shows per reading. Run: npx tsx engine-tests/reading-status.ts
import { readingCards, cardState } from "../lib/reading-status";
let f = 0; const ok = (l: string, c: boolean, g?: unknown) => { if (!c) f++; console.log(`${c ? "ok  " : "FAIL"} ${l}${g !== undefined ? `: ${JSON.stringify(g)}` : ""}`); };
const now = Date.parse("2026-11-14T22:30:00Z"); const ago = (s: number) => new Date(now - s * 1000).toISOString();
const R = (o: any) => ({ id: o.id ?? Math.random().toString(36).slice(2), status: "scheduled", attempts: 0, person_id: null, deliver_at: ago(o.age ?? 10), delivered_at: null, created_at: ago(o.age ?? 10), claimed_at: null, ...o });
ok("just created -> queued", cardState(R({ kind: "synastry", age: 5 }), now) === "queued");
ok("being written -> writing", cardState(R({ kind: "synastry", status: "generating", claimed_at: ago(40) }), now) === "writing");
ok("failed once, waiting to retry -> retrying", cardState(R({ kind: "synastry", attempts: 1, age: 600 }), now) === "retrying");
ok("never picked up -> stalled", cardState(R({ kind: "synastry", age: 300 }), now) === "stalled");
ok("writer died -> stalled", cardState(R({ kind: "fullchart", status: "generating", claimed_at: ago(16 * 60) }), now) === "stalled");
ok("failed -> failed", cardState(R({ kind: "synastry", status: "failed", attempts: 3 }), now) === "failed");
ok("arrived -> no card", cardState(R({ kind: "synastry", status: "ready", delivered_at: ago(1) }), now) === null);
ok("scheduled for a later day -> no card", cardState(R({ kind: "timeline", deliver_at: new Date(now + 86400000).toISOString() }), now) === null);
const cards = readingCards([
  R({ id: "full", kind: "fullchart", status: "generating", claimed_at: ago(100), age: 101 }),
  R({ id: "syn", kind: "synastry", person_id: "p1", status: "generating", claimed_at: ago(8), age: 9 }),
], now);
ok("Full Chart and synastry each get their own card", cards.length === 2 && cards[0].id === "syn" && cards[0].state === "writing" && cards[1].id === "full", cards.map(c => `${c.kind}:${c.state}`));
ok("synastry card carries its person", cards[0].personId === "p1");
// Emily's account today: two failed Full Charts, nothing else pending
const hers = readingCards([R({ id: "f2", kind: "fullchart", status: "failed", attempts: 3, age: 3000 }), R({ id: "f1", kind: "fullchart", status: "failed", attempts: 3, age: 6000 })], now);
ok("two failed Full Charts show as one failed card (the latest)", hers.length === 1 && hers[0].id === "f2" && hers[0].state === "failed", hers);
const moved = readingCards([R({ id: "new", kind: "fullchart", status: "generating", claimed_at: ago(5), age: 6 }), R({ id: "old", kind: "fullchart", status: "failed", age: 6000 })], now);
ok("an old failure disappears once a new try exists", moved.length === 1 && moved[0].id === "new");
console.log(f ? `\n${f} failed` : "\nall reading-status checks passed"); process.exit(f ? 1 : 0);
