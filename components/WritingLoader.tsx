"use client";
// Shown on the dashboard while a reading is being written: the member's own sign card,
// little planets orbiting it, a slow progress line and rotating status lines.
import { useEffect, useState } from "react";

const LINES: Record<string, string[]> = {
  fullchart: [
    "Finding where every planet was the minute you were born",
    "Checking which fixed stars sit on your chart",
    "Asking Saturn to be gentle",
    "Weighing your elements and modes",
    "Following your progressed Moon",
    "Mapping your next two years, date by date",
    "Lining up your Human Design gates",
    "Choosing a ritual for your next big date",
  ],
  synastry: [
    "Laying your two charts on top of each other",
    "Seeing whose planets land in whose houses",
    "Measuring every aspect between you",
    "Checking what Venus has to say",
    "Finding the dates that matter for you both",
  ],
  default: [
    "Lining up your planets",
    "Reading the aspects",
    "Finding your exact dates",
    "Asking the Moon for a second opinion",
    "Adding the finishing touches",
  ],
};
import RetryReading from "./RetryReading";
import { KIND_NAME, type CardState } from "@/lib/reading-status";

const EXPECTED: Record<string, number> = { fullchart: 200, synastry: 100 };

/** One reading's own status. `state` and `since` come from that reading's row; nothing here claims progress
 *  the app can't see. The bar is an estimate from typical writing times and says so. */
export default function WritingLoader({ id, kind, state, since, art, sign, who }: {
  id: string; kind: string; state: CardState; since: string; art?: string; sign: string; who?: string | null;
}) {
  const lines = LINES[kind] ?? LINES.default;
  const expected = EXPECTED[kind] ?? 120;
  const name = KIND_NAME[kind] ?? "reading";
  // Starts at 0 on the server and the first paint, then follows the clock (avoids a hydration mismatch)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = now == null ? 0 : Math.max(0, (now - new Date(since).getTime()) / 1000);
  const pct = Math.min(95, 95 * (1 - Math.exp(-2.2 * elapsed / expected)));
  const forWhom = kind === "synastry" && who ? `Written for you and ${who}` : `Written just for your ${sign} chart`;

  if (state === "failed" || state === "stalled") return (
    <div className="writing problem" role="status">
      <h3>{state === "failed" ? `We couldn't finish your ${name}` : `Your ${name} has stalled`}</h3>
      <p className="writing-line">{state === "failed" ? "Something went wrong while it was being written." : "It hasn't moved for a while."} Try again{kind === "synastry" || kind === "yearahead" ? ": you won't be charged again" : ""}.</p>
      <RetryReading id={id} />
    </div>
  );
  const line = state === "queued" ? "Payment and details confirmed. Starting in a moment"
    : state === "retrying" ? "The first try hit a snag. Trying again"
    : elapsed > expected * 1.25 ? "Taking longer than usual. Still writing"
    : lines[Math.floor(elapsed / 6) % lines.length];
  return (
    <div className="writing" role="status" aria-live="polite" data-kind={kind} data-state={state}>
      <div className="writing-orbit" aria-hidden="true">
        {art ? <img src={art} alt="" width={160} height={240} /> : <span className="writing-glyph">✦</span>}
        <span className="ring r1"><i /></span>
        <span className="ring r2"><i /></span>
        <span className="ring r3"><i /></span>
      </div>
      <h3>Writing your {name}</h3>
      <p key={line} className="writing-line">{line}…</p>
      {state === "writing" && <div className="writing-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>}
      <p className="hint">{forWhom}, so it takes {kind === "fullchart" ? "a few minutes" : "a minute or two"}. You can leave this page; it'll be here when you're back.</p>
      {state === "retrying" && <RetryReading id={id} label="Try again now" />}
    </div>
  );
}
