"use client";
// The Seeing Numbers journal for signed-in members. Entries are saved to their account;
// the cap and ownership are enforced on the server.
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { normalizeNumber, interpretNumber, GENERAL_QUESTION, whenLabel } from "@/lib/seeing-numbers";

export type Entry = {
  id: string; number_raw: string; number_norm: string; seen_at: string; seen_local_date: string;
  seen_local_time: string | null; seen_tz: string; note: string | null;
};

const pad = (n: number) => String(n).padStart(2, "0");
function nowLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function Meaning({ norm, open = false }: { norm: string; open?: boolean }) {
  const m = interpretNumber(norm);
  return (
    <div className={`sn-meaning ${open ? "open" : ""}`}>
      {m && <p>{m.meaning}</p>}
      <p className="sn-question"><em>{m?.question ?? GENERAL_QUESTION}</em></p>
    </div>
  );
}

export default function SeeingNumbers({ initial, cap, compare, deep }: { initial: Entry[]; cap: number | null; compare: boolean; deep: boolean }) {
  const [entries, setEntries] = useState<Entry[]>(initial);
  const [number, setNumber] = useState("");
  const [seenLocal, setSeenLocal] = useState("");
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState<Entry | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [capped, setCapped] = useState(false);
  useEffect(() => { setSeenLocal(nowLocal()); }, []);

  const sorted = useMemo(() => [...entries].sort((a, b) => b.seen_at.localeCompare(a.seen_at)), [entries]);
  const atCap = (cap != null && entries.length >= cap) || capped;
  const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

  function reset() { setNumber(""); setNote(""); setSeenLocal(nowLocal()); setEditing(null); setErr(""); }
  function startEdit(e: Entry) {
    setEditing(e.id); setNumber(e.number_raw); setNote(e.note ?? ""); setSeenLocal(`${e.seen_local_date}T${e.seen_local_time ?? "12:00"}`);
    setSaved(null); setErr(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!normalizeNumber(number)) { setErr("Enter the number you saw, like 444, 12:12 or 1133."); return; }
    setBusy(true); setErr("");
    const r = await fetch(editing ? `/api/journal/${editing}` : "/api/journal", {
      method: editing ? "PATCH" : "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ number, seenLocal, tz: tz(), note }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (r.status === 409) { setCapped(true); return; }
    if (j.redirect) { location.href = j.redirect; return; }
    if (!r.ok || !j.entry) { setErr(j.error ?? "Couldn't save. Try again."); return; }
    setEntries(list => editing ? list.map(x => (x.id === editing ? j.entry : x)) : [j.entry, ...list]);
    setSaved(j.entry); reset();
  }

  async function remove(id: string) {
    const r = await fetch(`/api/journal/${id}`, { method: "DELETE" });
    if (r.ok) { setEntries(list => list.filter(x => x.id !== id)); setCapped(false); if (saved?.id === id) setSaved(null); }
    setConfirmDelete(null);
  }

  const showForm = editing || !atCap;
  return (
    <div className="sn">
      {saved && !editing && (
        <div className="sn-saved" role="status">
          <p className="sn-saved-head">Saved: <strong>{saved.number_raw}</strong></p>
          <Meaning norm={saved.number_norm} open />
        </div>
      )}

      {showForm ? (
        <form onSubmit={submit} className="panel sn-form" id="log">
          {editing && <p className="hint">Editing an entry. <button type="button" className="linklike" onClick={reset}>Cancel</button></p>}
          <div className="field"><label htmlFor="sn-number">What number did you see?</label>
            <input id="sn-number" inputMode="text" autoComplete="off" placeholder="444, 12:12, 1133…" value={number} onChange={e => setNumber(e.target.value)} /></div>
          <div className="field"><label htmlFor="sn-when">When did you see it?</label>
            <input id="sn-when" type="datetime-local" required value={seenLocal} onChange={e => setSeenLocal(e.target.value)} /></div>
          <div className="field"><label htmlFor="sn-note">What was happening, or what were you thinking about? <span className="hint">(optional)</span></label>
            <textarea id="sn-note" rows={3} maxLength={1000} value={note} onChange={e => setNote(e.target.value)} placeholder="I saw 12:12 right before I called my boss." /></div>
          {err && <p className="error">{err}</p>}
          <button className="btn" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Save it"}</button>
          {cap != null && !editing && <p className="hint" style={{ marginTop: 10 }}>{entries.length} of {cap} entries saved during the pilot. Private to your account.</p>}
        </form>
      ) : (
        <div className="panel">
          <p><strong>You've saved {cap} entries,</strong> the limit for the pilot. You can still read, edit and delete them.</p>
          {compare && !deep && <p className="hint">Deep Dive members can keep unlimited entries and compare each one with their timeline. <Link href="/dashboard?plan=deep">See Deep Dive</Link></p>}
        </div>
      )}

      {compare && deep && entries.length > 0 && <p><Link className="link-arrow" href="/seeing-numbers/recap">Your monthly recap →</Link></p>}

      {sorted.length === 0 && <p className="hint">Nothing saved yet. The next time a number catches your eye, write it here.</p>}
      <ul className="sn-list">
        {sorted.map(e => (
          <li key={e.id} id={`entry-${e.id}`}>
            <div className="sn-row">
              <span className="sn-num">{e.number_raw}</span>
              <div className="sn-body">
                <span className="hint">{whenLabel(e)}</span>
                {e.note && <p className="sn-note">{e.note}</p>}
                <details><summary>What it might mean</summary><Meaning norm={e.number_norm} /></details>
                <div className="sn-actions">
                  {compare && (deep
                    ? <Link href={`/seeing-numbers/${e.id}`}>Compare with my timeline</Link>
                    : <Link href="/dashboard?plan=deep" className="hint">Compare with my timeline (Deep Dive)</Link>)}
                  <button type="button" className="linklike" onClick={() => startEdit(e)}>Edit</button>
                  {confirmDelete === e.id ? (
                    <span>Delete this entry? <button type="button" className="linklike" onClick={() => remove(e.id)}>Yes, delete</button>{" "}
                      <button type="button" className="linklike" onClick={() => setConfirmDelete(null)}>No</button></span>
                  ) : <button type="button" className="linklike" onClick={() => setConfirmDelete(e.id)}>Delete</button>}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
