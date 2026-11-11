"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { encodeBirth } from "@/lib/freechart";

type Place = { label: string; latitude: number; longitude: number; timezone: string };

/** No sign-in: the birth details go straight into the results page's link. */
export default function FreeChartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [noTime, setNoTime] = useState(false);
  const [q, setQ] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [options, setOptions] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (place && q === place.label) { setOptions([]); return; }
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setOptions([]); return; }
    timer.current = setTimeout(async () => {
      const r = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`).catch(() => null);
      setOptions(r?.ok ? await r.json() : []);
    }, 200);
  }, [q, place]);

  function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    if (!date) { setErr("Enter your birth date."); return; }
    if (!noTime && !time) { setErr("Enter your birth time, or tick “I don't know my birth time”."); return; }
    if (!place) { setErr("Choose your birthplace from the list so we know its exact location."); return; }
    setBusy(true);
    const b = encodeBirth({ n: name.trim() || undefined, d: date, t: noTime ? null : time, p: place.label, la: place.latitude, lo: place.longitude, tz: place.timezone });
    router.push(`/chart/result?b=${b}`);
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="fc-name">First name <span className="opt">(optional)</span></label>
        <input id="fc-name" maxLength={40} autoComplete="given-name" value={name} onChange={e => setName(e.target.value)} /></div>
      <div className="row">
        <div className="field"><label htmlFor="fc-date">Birth date</label>
          <input id="fc-date" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={date} onChange={e => setDate(e.target.value)} /></div>
        <div className="field"><label htmlFor="fc-time">Birth time</label>
          <input id="fc-time" type="time" disabled={noTime} value={time} onChange={e => setTime(e.target.value)} /></div>
      </div>
      <p className="hint why-time">Your birth time sets your Rising sign and houses. The Rising sign changes about every two hours, so even a rough time helps. A birth certificate or a family member may know it.</p>
      <div className="field"><label className="check"><input type="checkbox" checked={noTime} onChange={e => setNoTime(e.target.checked)} /> I don't know my birth time</label>
        {noTime && <p className="hint">You'll still get most of your chart. We'll leave out your Rising sign and houses, and flag anything that could change depending on the hour.</p>}</div>
      <div className="field suggest"><label htmlFor="fc-place">Birthplace</label>
        <input id="fc-place" autoComplete="off" placeholder="Start typing a city" value={q}
          onChange={e => { setQ(e.target.value); setPlace(null); }} aria-autocomplete="list" aria-controls="fc-place-list" />
        {options.length > 0 && (
          <ul role="listbox" id="fc-place-list">
            {options.map(o => (
              <li key={`${o.label}${o.latitude}`}><button type="button" onClick={() => { setPlace(o); setQ(o.label); setOptions([]); }}>{o.label}</button></li>
            ))}
          </ul>
        )}
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Calculating…" : "Calculate my chart"}</button>
      <p className="hint" style={{ marginTop: 14 }}>No account needed. We don't save your birth details unless you ask us to email you your chart.</p>
    </form>
  );
}
