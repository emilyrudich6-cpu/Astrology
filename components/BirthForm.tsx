"use client";
import { useEffect, useRef, useState } from "react";

type Place = { label: string; latitude: number; longitude: number; timezone: string };

export default function BirthForm({ endpoint, submitLabel, withRelationship = false, initial, onDone }: {
  endpoint: string; submitLabel: string; withRelationship?: boolean;
  initial?: Partial<{ name: string; birth_date: string; birth_time: string | null; birth_place: string; latitude: number; longitude: number; timezone: string }>;
  onDone?: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [relationship, setRelationship] = useState("partner");
  const [date, setDate] = useState(initial?.birth_date ?? "");
  const [time, setTime] = useState(initial?.birth_time ?? "");
  const [noTime, setNoTime] = useState(initial ? !initial.birth_time : false);
  const [q, setQ] = useState(initial?.birth_place ?? "");
  const [place, setPlace] = useState<Place | null>(initial?.latitude != null ? { label: initial.birth_place ?? "", latitude: initial.latitude!, longitude: initial.longitude!, timezone: initial.timezone! } : null);
  const [options, setOptions] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (place && q === place.label) { setOptions([]); return; }
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
      setOptions(r.ok ? await r.json() : []);
    }, 200);
  }, [q, place]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!place) { setErr("Pick the birthplace from the list so we know its exact location."); return; }
    setBusy(true);
    const r = await fetch(endpoint, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, relationship, birth_date: date, birth_time: noTime ? null : time || null, birth_place: place.label, latitude: place.latitude, longitude: place.longitude, timezone: place.timezone }),
    });
    setBusy(false);
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Something went wrong. Try again."); return; }
    if (onDone) onDone(); else if (j.redirect) location.href = j.redirect;
  }

  return (
    <form onSubmit={submit}>
      <div className="field"><label htmlFor="bf-name">{withRelationship ? "Their name" : "Your first name"}</label>
        <input id="bf-name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} /></div>
      {withRelationship && (
        <div className="field"><label htmlFor="bf-rel">Who are they to you?</label>
          <select id="bf-rel" value={relationship} onChange={e => setRelationship(e.target.value)}>
            {["partner", "crush", "ex", "friend", "family", "business partner", "coworker"].map(r => <option key={r}>{r}</option>)}
          </select></div>
      )}
      <div className="row">
        <div className="field"><label htmlFor="bf-date">Birth date</label>
          <input id="bf-date" type="date" required min="1900-01-01" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="bf-time">Birth time</label>
          <input id="bf-time" type="time" disabled={noTime} required={!noTime} value={time ?? ""} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <div className="field"><label className="check"><input type="checkbox" checked={noTime} onChange={e => setNoTime(e.target.checked)} /> I don't know the birth time</label>
        {noTime && <p className="hint">Without a time we skip houses, the Ascendant and the chart ruler, and the Moon may be a few degrees off.</p>}</div>
      <div className="field suggest"><label htmlFor="bf-place">Birthplace</label>
        <input id="bf-place" required autoComplete="off" placeholder="Start typing a city" value={q}
          onChange={e => { setQ(e.target.value); setPlace(null); }} aria-autocomplete="list" />
        {options.length > 0 && (
          <ul role="listbox">
            {options.map(o => (
              <li key={`${o.label}${o.latitude}`}><button type="button" onClick={() => { setPlace(o); setQ(o.label); setOptions([]); }}>{o.label}</button></li>
            ))}
          </ul>
        )}
        {place && <p className="hint">Time zone: {place.timezone}. Daylight saving at the time of birth is handled automatically.</p>}
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
