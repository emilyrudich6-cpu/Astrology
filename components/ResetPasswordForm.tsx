"use client";
// Set a new password. The reset email's link lands here, in whatever browser it was opened in, carrying a
// one-time sign-in after the "#". We use it, then wipe it from the address bar. It is never logged or sent to our server.
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase-browser";

type State = "checking" | "ready" | "expired" | "none";
const NEW_LINK = "/login?mode=forgot&link=reset";

export default function ResetPasswordForm() {
  const [state, setState] = useState<State>("checking");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<React.ReactNode>("");

  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1)), q = new URLSearchParams(location.search);
    const failed = h.get("error_code") ?? h.get("error") ?? q.get("error_code") ?? q.get("error");
    const access_token = h.get("access_token"), refresh_token = h.get("refresh_token");
    if (location.hash || location.search) history.replaceState(null, "", location.pathname);
    const sb = supabaseBrowser();
    (async () => {
      if (failed) return setState("expired");
      if (access_token && refresh_token) {
        const { error } = await sb.auth.setSession({ access_token, refresh_token });
        return setState(error ? "expired" : "ready");
      }
      // No link in the address: fine if they're already signed in (e.g. an older-style link), otherwise ask for one
      const { data } = await sb.auth.getSession();
      setState(data.session ? "ready" : "none");
    })();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    const { error } = await supabaseBrowser().auth.updateUser({ password });
    if (!error) { location.href = "/dashboard"; return; }
    setBusy(false);
    if (/password/i.test(error.message)) setErr(/different/i.test(error.message) ? "Choose a password you haven't used here before." : "Choose a password with at least 8 characters.");
    else if (/session|auth|jwt|token/i.test(error.message)) setState("expired");
    else setErr("We couldn't save that. Try again in a moment.");
  }

  if (state === "checking") return <p className="hint" role="status">One moment…</p>;
  if (state !== "ready") return (
    <div className="auth-done">
      <p className="notice" role="alert">{state === "expired" ? "This reset link has expired or was already used." : "Open the link in your reset email to set a new password."}</p>
      <p><Link className="btn" href={state === "expired" ? NEW_LINK : "/login?mode=forgot"}>Send me a new link</Link></p>
      <p><Link href="/login?mode=signin">Back to sign in</Link></p>
    </div>
  );
  return (
    <form onSubmit={save}>
      <div className="field"><label htmlFor="pw">New password</label>
        <div className="pw">
          <input id="pw" type={show ? "text" : "password"} required minLength={8} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
          <button type="button" className="linklike" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
        </div>
        <p className="hint">At least 8 characters.</p></div>
      {err && <p className="error">{err}</p>}
      <button className="btn" disabled={busy}>{busy ? "Saving…" : "Save password"}</button>
    </form>
  );
}
