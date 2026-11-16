"use client";
// Saved Friends: add, edit and remove private birth profiles, see both Big Threes side by side, and open the
// existing synastry flow with both people filled in. Deep Dive uses its monthly readings; everyone else checks out.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BirthForm from "./BirthForm";
import type { BigThree } from "@/lib/friends";

export type Friend = {
  id: string; name: string; relationship: string; birth_date: string; birth_time: string | null; birth_place: string;
  latitude: number; longitude: number; timezone: string; big3: BigThree;
};
type Plan = { remaining: number; perMonth: number; extraPrice: string; renews?: string } | null;

const moonText = (m: BigThree["moon"]) => (Array.isArray(m) ? `${m[0]} or ${m[1]}` : m);

export default function SavedFriends({ friends, me, myName, max, plan, price }: {
  friends: Friend[]; me: BigThree; myName: string; max: number; plan: Plan; price: string;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const router = useRouter();

  async function buyExtra(id: string) {
    setMsg("Opening secure checkout…");
    const r = await fetch("/api/buy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "extra", person_id: id }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (j.url) { location.href = j.url; return; }
    setBusy(null); setMsg(j.error ?? "Checkout didn't open. Try again.");
  }
  // Deep Dive: one of this month's included readings, or an extra one at the member price
  async function compareIncluded(f: Friend) {
    setBusy(f.id); setMsg("");
    if (plan!.remaining <= 0) return buyExtra(f.id);
    const r = await fetch("/api/people/read", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: f.id }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (j.needsExtra) return buyExtra(f.id);
    setBusy(null);
    if (!r?.ok) { setMsg(j.error ?? "That didn't start. Try again."); return; }
    setMsg(`Your synastry reading with ${f.name} is being written. It'll appear in Your readings in a minute or two.`);
    router.refresh();
  }
  async function remove(f: Friend) {
    if (!confirm(`Remove ${f.name}? Readings you already have stay in your inbox.`)) return;
    setBusy(f.id);
    await fetch(`/api/friends?id=${f.id}`, { method: "DELETE" }).catch(() => null);
    setBusy(null); router.refresh();
  }

  return (
    <div className="friends">
      {plan && <p className="hint">{plan.remaining > 0 ? `${plan.remaining} of ${plan.perMonth} compatibility readings left this billing month.` : `You've used all ${plan.perMonth} compatibility readings for this billing month.${plan.renews ? ` Your next ${plan.perMonth} arrive on ${plan.renews}.` : ""} More are ${plan.extraPrice} each.`}</p>}
      {friends.length === 0 && !adding && <p className="friends-empty">Add a friend to see your charts side by side.</p>}
      {friends.map(f => editing === f.id ? (
        <div key={f.id} className="friend-card">
          <h4>Edit {f.name}</h4>
          <BirthForm endpoint="/api/friends" extra={{ id: f.id }} withRelationship nameLabel="Name or nickname" submitLabel="Save changes"
            initial={{ ...f }} onDone={() => { setEditing(null); setMsg(""); router.refresh(); }} />
          <button type="button" className="linklike" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      ) : (
        <div key={f.id} className="friend-card" data-friend={f.name}>
          <div className="friend-head">
            <h4>{f.name}</h4>
            <span className="hint">{f.relationship}</span>
          </div>
          <table className="pair3" aria-label={`Your Big Three together: ${myName} and ${f.name}`}>
            <caption>Your Big Three together</caption>
            <thead><tr><td /><th scope="col">{myName}</th><th scope="col">{f.name}</th></tr></thead>
            <tbody>
              <tr><th scope="row">Sun</th><td>{me.sun}</td><td>{f.big3.sun}</td></tr>
              <tr><th scope="row">Moon</th><td>{moonText(me.moon)}</td><td>{moonText(f.big3.moon)}</td></tr>
              <tr><th scope="row">Rising</th><td>{me.rising ?? <span className="hint">Needs birth time</span>}</td><td>{f.big3.rising ?? <span className="hint">Needs birth time</span>}</td></tr>
            </tbody>
          </table>
          {(Array.isArray(f.big3.moon) || Array.isArray(me.moon)) && <p className="hint">The Moon changed sign that day, so without a birth time it could be either.</p>}
          <div className="friend-actions">
            {plan
              ? <button type="button" className="btn primary" disabled={busy === f.id} onClick={() => compareIncluded(f)}>{busy === f.id ? "Starting…" : plan.remaining > 0 ? "Compare charts" : `Compare charts, ${plan.extraPrice}`}</button>
              : <Link className="btn primary" href={`/buy/synastry?friend=${f.id}`}>Compare charts</Link>}
            <button type="button" className="linklike" onClick={() => { setEditing(f.id); setAdding(false); }}>Edit</button>
            <button type="button" className="linklike" disabled={busy === f.id} onClick={() => remove(f)} aria-label={`Remove ${f.name}`}>Remove</button>
          </div>
          {!plan && <p className="hint">Compare charts opens the Compatibility (Synastry) Reading for you two, {price}.</p>}
        </div>
      ))}
      {msg && <p className="notice" role="status">{msg}</p>}
      {adding ? (
        <div className="friend-card">
          <h4>Add a friend</h4>
          <BirthForm endpoint="/api/friends" withRelationship nameLabel="Name or nickname" defaultRelationship="friend" submitLabel="Save friend"
            onDone={() => { setAdding(false); setMsg(""); router.refresh(); }} />
          <button type="button" className="linklike" onClick={() => setAdding(false)}>Cancel</button>
        </div>
      ) : friends.length < max ? (
        <button type="button" className={friends.length ? "btn ghost" : "btn primary"} onClick={() => { setAdding(true); setEditing(null); }}>Add a friend</button>
      ) : <p className="hint">You've saved {max} friends, the most an account can hold. Remove one to add another.</p>}
      <p className="hint">Saved friends are private to your account.</p>
    </div>
  );
}
