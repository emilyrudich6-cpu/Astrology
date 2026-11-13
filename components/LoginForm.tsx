"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const sb = supabaseBrowser();

  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb.auth.signInWithOtp({
      email, options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (error) setErr(error.message); else setSent(true);
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await sb.auth.verifyOtp({ email, token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setErr("That code didn't work. Check the latest email, or send a new code.");
    else location.href = next;
  }

  if (!sent) return (
    <form onSubmit={send}>
      <div className="field"><label htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</button>
    </form>
  );
  return (
    <form onSubmit={verify}>
      <p>We emailed a sign-in link to <strong>{email}</strong>. Open it on this same phone or computer, in this same browser, and you'll be signed in.</p>
      <p className="hint">If your email shows a 6-digit code instead, type it here.</p>
      <div className="field"><label htmlFor="code">6-digit code</label>
        <input id="code" inputMode="numeric" autoComplete="one-time-code" required value={code} onChange={e => setCode(e.target.value)} /></div>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Checking…" : "Sign in"}</button>{" "}
      <button type="button" className="btn ghost" onClick={() => { setSent(false); setCode(""); }}>Use a different email</button>
    </form>
  );
}
