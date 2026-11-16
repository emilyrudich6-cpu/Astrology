// What "Your readings" shows for each reading that hasn't arrived yet. Every state comes from the reading's
// own row (status, attempts, when writing started), never from a guess about how far along it is.
export const STALL_MINUTES = 15;   // same as the scheduler's "writer crashed" cut-off
const QUEUE_SECONDS = 90;          // a reading should be picked up well within this

export type CardState = "queued" | "waiting" | "writing" | "retrying" | "stalled" | "failed";
const LINE_MINUTES = 35;           // a place in line is re-confirmed at least every 15 minutes
export interface ReadingRow {
  id: string; kind: string; status: string; attempts?: number | null; person_id?: string | null;
  deliver_at: string; delivered_at?: string | null; created_at: string; claimed_at?: string | null;
}
export interface Card { id: string; kind: string; personId: string | null; state: CardState; since: string }

export const KIND_NAME: Record<string, string> = {
  fullchart: "Natal Chart Deep Dive", synastry: "Compatibility Reading", natal: "chart", timeline: "timeline", yearahead: "year ahead", question: "insight",
};

export function cardState(r: ReadingRow, now = Date.now()): CardState | null {
  if (r.delivered_at || r.status === "ready") return null;
  if (r.status === "failed") return "failed";
  if (new Date(r.deliver_at).getTime() > now) return null; // scheduled for a later day
  if (r.status === "generating") {
    const started = r.claimed_at ? new Date(r.claimed_at).getTime() : 0;
    return now - started > STALL_MINUTES * 60000 ? "stalled" : "writing";
  }
  // Waiting in line for a Deep Dive place: the time it last checked is kept in claimed_at
  if (r.kind === "fullchart" && (r.attempts ?? 0) === 0 && r.claimed_at && now - new Date(r.claimed_at).getTime() < LINE_MINUTES * 60000) return "waiting";
  if ((r.attempts ?? 0) > 0) return "retrying";
  return now - new Date(r.created_at).getTime() > QUEUE_SECONDS * 1000 ? "stalled" : "queued";
}

/** One card per reading in progress or failed, newest first. A failed reading is dropped once a newer
 *  reading of the same kind (and the same person, for synastry) exists, so old failures don't linger. */
export function readingCards(rows: ReadingRow[], now = Date.now()): Card[] {
  const sorted = [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const same = (a: ReadingRow, b: ReadingRow) => a.kind === b.kind && (a.person_id ?? null) === (b.person_id ?? null);
  const out: Card[] = [];
  sorted.forEach((r, i) => {
    const state = cardState(r, now);
    if (!state) return;
    if (state === "failed" && sorted.slice(0, i).some(n => same(n, r) && n.status !== "failed")) return;
    if (state === "failed" && sorted.slice(0, i).some(n => same(n, r))) return; // only the latest failure of a kind
    out.push({ id: r.id, kind: r.kind, personId: r.person_id ?? null, state, since: state === "writing" && r.claimed_at ? r.claimed_at : r.created_at });
  });
  return out;
}
