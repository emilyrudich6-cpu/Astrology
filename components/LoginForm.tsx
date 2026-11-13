"use client";
// Create an account or sign in with email and password. "Forgot password?" emails a reset link.
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase-browser";

type Mode = "signup" | "signin" | "forgot" | "confirm" | "resetSent";

export default function LoginForm({ next, initial = "signup" }: { next: string; initial?: "signup" | "signin" }) {
  const [mode, setMode] = useState<Mode>(initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<React.ReactNode>("");
  const sb = supabaseBrowser();
  const callback = (to: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(to)}`;
  const go = (m: Mode) => { setMode(m); setErr(""); };

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    if (mode === "signup") {
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callback(next) } });
      setBusy(false);
      if (error) {
        if (/registered|exists/i.test(error.message)) setErr(<>You already have an account with this email. <button type="button" className="linklike" onClick={() => go("signin")}>Sign in instead</button></>);
        else if (/password/i.test(error.message)) setErr("Choose a password with at least 8 characters.");
        else setErr(error.message);
        return;
      }
      // Supabase hides "already registered" behind an empty identities list
      if (data.user && data.user.identities?.length === 0) { setErr(<>You already have an account with this email. <button type="button" className="linklike" onClick={() => go("signin")}>Sign in instead</button></>); return; }
      if (data.session) location.href = next; else setMode("confirm");
    } else if (mode === "signin") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        if (/confirm/i.test(error.message)) setErr("Confirm your email first: open the email we sent you, then sign in here.");
        else setErr(<>That email and password don't match. New, or never set a password? <button type="button" className="linklike" onClick={() => go("forgot")}>Set one here</button></>);
        return;
      }
      location.href = next;
    } else if (mode === "forgot") {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: callback("/reset-password") });
      setBusy(false);
      if (error) setErr(/rate|many/i.test(error.message) ? "Too many emails just now. Wait a few minutes and try again." : error.message);
      else setMode("resetSent");
    }
  }

  if (mode === "confirm") return (
    <div className="auth-done">
      <h2>Check your inbox</h2>
      <p>We sent a confirmation email to <strong>{email}</strong>. Tap the button in it, and you'll land in your account.</p>
      <p className="hint">Nothing there? Check spam or promotions.</p>
    </div>
  );
  if (mode === "resetSent") return (
    <div className="auth-done">
      <h2>Check your inbox</h2>
      <p>We sent a link to <strong>{email}</strong> to set a new password. Open it on this same phone or computer.</p>
      <button type="button" className="linklike" onClick={() => go("signin")}>Back to sign in</button>
    </div>
  );

  const label = mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Email me a reset link";
  return (
    <>
      {mode !== "forgot" && (
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => go("signup")}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => go("signin")}>Sign in</button>
        </div>
      )}
      <form onSubmit={submit}>
        {mode === "forgot" && <p className="hint">Enter your email and we'll send you a link to set a new password.</p>}
        <div className="field"><label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        {mode !== "forgot" && (
          <div className="field"><label htmlFor="password">Password</label>
            <div className="pw">
              <input id="password" type={show ? "text" : "password"} required minLength={8}
                autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} />
              <button type="button" className="linklike" onClick={() => setShow(s => !s)} aria-pressed={show}>{show ? "Hide" : "Show"}</button>
            </div>
            {mode === "signup" && <p className="hint">At least 8 characters.</p>}
          </div>
        )}
        {err && <p className="error">{err}</p>}
        <button className="btn" disabled={busy}>{busy ? "One moment…" : label}</button>
        {mode === "signin" && <p><button type="button" className="linklike" onClick={() => go("forgot")}>Forgot password?</button></p>}
        {mode === "forgot" && <p><button type="button" className="linklike" onClick={() => go("signin")}>Back to sign in</button></p>}
      </form>
    </>
  );
}
