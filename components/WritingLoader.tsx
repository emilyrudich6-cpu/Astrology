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
const TITLES: Record<string, string> = {
  fullchart: "Writing your Full Chart", synastry: "Writing your synastry reading", natal: "Writing your chart",
  timeline: "Writing your timeline", yearahead: "Writing your year ahead", question: "Writing your insight",
};
const EXPECTED: Record<string, number> = { fullchart: 200, synastry: 100 };

export default function WritingLoader({ kind, startedAt, art, sign }: { kind: string; startedAt: string; art?: string; sign: string }) {
  const lines = LINES[kind] ?? LINES.default;
  const expected = EXPECTED[kind] ?? 120;
  // Starts at 0 on the server and the first paint, then follows the clock (avoids a hydration mismatch)
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const elapsed = now == null ? 0 : Math.max(0, (now - new Date(startedAt).getTime()) / 1000);
  const line = lines[Math.floor(elapsed / 6) % lines.length];
  // Eases toward 95% so it never claims to be done before it is
  const pct = Math.min(95, 95 * (1 - Math.exp(-2.2 * elapsed / expected)));
  const late = elapsed > expected * 1.25;

  return (
    <div className="writing" role="status" aria-live="polite">
      <div className="writing-orbit" aria-hidden="true">
        {art ? <img src={art} alt="" width={160} height={240} /> : <span className="writing-glyph">✦</span>}
        <span className="ring r1"><i /></span>
        <span className="ring r2"><i /></span>
        <span className="ring r3"><i /></span>
      </div>
      <h3>{TITLES[kind] ?? "Writing your reading"}</h3>
      <p key={line} className="writing-line">{late ? "Almost there, polishing the last pages" : line}…</p>
      <div className="writing-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></div>
      <p className="hint">Written just for your {sign} chart, so it takes a few minutes. You can leave this page; it'll be here when you're back.</p>
    </div>
  );
}
