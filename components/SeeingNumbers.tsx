"use client";
// A private on-device journal: what number you saw, when, and what was on your mind.
import { useEffect, useState } from "react";

type Entry = { id: string; number: string; note: string; at: string };
const KEY = "vp-seeing-numbers";

export default function SeeingNumbers() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [number, setNumber] = useState("");
  const [note, setNote] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { try { setEntries(JSON.parse(localStorage.getItem(KEY) ?? "[]")); } catch {} setLoaded(true); }, []);
  const save = (list: Entry[]) => { setEntries(list); try { localStorage.setItem(KEY, JSON.stringify(list)); } catch {} };

  function add(e: React.FormEvent) {
    e.preventDefault();
    const n = number.trim();
    if (!/^[0-9][0-9:.\s]{0,11}$/.test(n)) { setErr("Enter the number you saw, like 111 or 11:11."); return; }
    setErr("");
    save([{ id: crypto.randomUUID?.() ?? String(Date.now()), number: n, note: note.trim(), at: new Date().toISOString() }, ...entries]);
    setNumber(""); setNote("");
  }
  const counts = entries.reduce<Record<string, number>>((m, x) => ((m[x.number] = (m[x.number] ?? 0) + 1), m), {});
  const repeats = Object.entries(counts).filter(([, c]) => c > 1).sort((a, b) => b[1] - a[1]);

  return (
    <div className="seeing">
      <form onSubmit={add} className="panel">
        <div className="field"><label htmlFor="sn-number">What did you see?</label>
          <input id="sn-number" inputMode="numeric" autoComplete="off" placeholder="111, 11:11, 444…" value={number} onChange={e => setNumber(e.target.value)} /></div>
        <div className="field"><label htmlFor="sn-note">What was on your mind?</label>
          <textarea id="sn-note" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Who you were thinking about, what you were deciding, how you felt" /></div>
        {err && <p className="error">{err}</p>}
        <button className="btn small">Save it</button>
        <p className="hint" style={{ marginTop: 10 }}>Private: saved on this device only, so it won't move to another phone or browser.</p>
      </form>

      {repeats.length > 0 && (
        <p className="seeing-repeats">You keep seeing {repeats.slice(0, 3).map(([n, c]) => `${n} (${c} times)`).join(", ")}.</p>
      )}
      {loaded && entries.length === 0 && <p className="hint">Nothing saved yet. The next time a number catches your eye, write it here.</p>}
      <ul className="seeing-list">
        {entries.map(x => (
          <li key={x.id}>
            <span className="seeing-num">{x.number}</span>
            <div>
              <span className="hint">{new Date(x.at).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
              {x.note && <p>{x.note}</p>}
            </div>
            <button type="button" className="linklike" aria-label={`Delete ${x.number} entry`} onClick={() => save(entries.filter(e => e.id !== x.id))}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
