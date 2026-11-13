"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

export default function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<React.ReactNode>("");
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    setBusy(false);
    if (!error) { location.href = "/dashboard"; return; }
    if (/session|auth/i.test(error.message)) setErr(<>This link has expired or was opened in a different browser. <Link href="/login?mode=signin">Request a new one</Link>.</>);
    else if (/password/i.test(error.message)) setErr(/different/i.test(error.message) ? "Choose a password you haven't used here before." : "Choose a password with at least 8 characters.");
    else setErr(error.message);
  }
  return (
    <form onSubmit={save}>
      <div className="field"><label htmlFor="pw">New password</label>
        <input id="pw" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
        <p className="hint">At least 8 characters.</p></div>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}
