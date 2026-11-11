"use client";
import { useState } from "react";

export default function NewsletterSignup({ source = "results" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  async function join(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, source }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r?.ok) setDone(true); else setMsg(j.error ?? "That didn't go through. Try again.");
  }
  return (
    <div className="newsletter">
      <h3>Notes from Vertex Point</h3>
      {done ? <p role="status">You're on the list. The next note will find you.</p> : (
        <>
          <p>An occasional letter about what's moving in the sky and what it might mean. Separate from your chart, and easy to leave any time.</p>
          <form className="email-row" onSubmit={join}>
            <label htmlFor={`nl-${source}`} className="sr-only">Email address</label>
            <input id={`nl-${source}`} type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
            <button className="btn small" disabled={busy}>{busy ? "Joining…" : "Sign me up"}</button>
          </form>
          {msg && <p className="hint" role="status" style={{ marginTop: 8 }}>{msg}</p>}
        </>
      )}
    </div>
  );
}
