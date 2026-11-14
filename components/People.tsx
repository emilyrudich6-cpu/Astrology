"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BirthForm from "./BirthForm";

type Person = { id: string; name: string; relationship: string };

/** Your People: saved connections. Deep Dive includes a set number of compatibility readings a month; more are $3.99 each. */
export default function People({ people, max, remaining, perMonth, extraPrice }: {
  people: Person[]; max: number; remaining: number; perMonth: number; extraPrice: string;
}) {
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function buyExtra(id: string) {
    setBusy(id); setMsg("Opening secure checkout…");
    const r = await fetch("/api/buy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "extra", person_id: id }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (j.url) { location.href = j.url; return true; }
    setBusy(null); setMsg(j.error ?? "Checkout didn't open. Try again."); return false;
  }
  async function read(p: Person) {
    setBusy(p.id); setMsg("");
    if (remaining <= 0) { await buyExtra(p.id); return; }
    const r = await fetch("/api/people/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (j.needsExtra) { await buyExtra(p.id); return; }
    if (!r.ok) { setMsg(j.error ?? "That didn't work. Try again."); return; }
    setMsg(`Your reading with ${p.name} is being written. It'll be in your readings in about two minutes.`);
    router.refresh();
  }
  async function remove(p: Person) {
    if (!confirm(`Remove ${p.name}? Readings you already have stay in your inbox.`)) return;
    await fetch(`/api/people?id=${p.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div>
      <p className="hint">{remaining > 0 ? `${remaining} of ${perMonth} synastry readings left this month.` : `You've used this month's ${perMonth} readings. More are ${extraPrice} each, or wait until next month.`}</p>
      {people.length > 0 && (
        <ul className="people">
          {people.map(p => (
            <li key={p.id}>
              <span><strong>{p.name}</strong> <span className="hint">{p.relationship}</span></span>
              <span className="people-actions">
                <button className="btn small" disabled={busy === p.id} onClick={() => read(p)}>{busy === p.id ? "Starting…" : remaining > 0 ? "Read us" : `Read us, ${extraPrice}`}</button>
                <button className="btn ghost small" onClick={() => remove(p)} aria-label={`Remove ${p.name}`}>Remove</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {msg && <p className="notice" role="status">{msg}</p>}
      {people.length < max && !adding && (
        <button className="btn ghost" style={{ marginTop: 10 }} onClick={() => setAdding(true)}>Add someone</button>
      )}
      {adding && (
        <BirthForm endpoint="/api/people" submitLabel={remaining > 0 ? "Save and read us" : "Save them"} withRelationship
          onDone={() => { setAdding(false); setMsg(remaining > 0 ? "Saved. Your reading is being written and will be ready in about two minutes." : `Saved. Tap "Read us, ${extraPrice}" when you want a reading.`); router.refresh(); }} />
      )}
    </div>
  );
}
