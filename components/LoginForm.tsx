"use client";
// Create an account or sign in with email and password. "Forgot password?" emails a reset link.
// After sign-up we wait for the confirmation email. On iPhone, Gmail opens that link in its own browser,
// which confirms the email but can't sign this tab in, so this tab quietly checks and carries on by itself.
import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser, supabaseResetRequest } from "@/lib/supabase-browser";

type Mode = "signup" | "signin" | "forgot" | "confirm" | "resetSent" | "resend" | "resent";
type Link = "confirmed" | "expired" | "invalid" | "reset";

const DEFAULT_NEXT = "/dashboard";
const safe = (n: unknown) => (typeof n === "string" && n.startsWith("/") && !n.startsWith("//") ? n : null);

export default function LoginForm({ next, initial = "signup", link, signedInAs = null }: {
  next: string; initial?: "signup" | "signin" | "forgot"; link?: Link; signedInAs?: string | null;
}) {
  const [mode, setMode] = useState<Mode>(link === "expired" || link === "invalid" ? "resend" : initial);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<React.ReactNode>("");
  const [who, setWho] = useState(signedInAs);
  const [cooldown, setCooldown] = useState(0);
  const sb = supabaseBrowser();
  const callback = (to: string) => `${location.origin}/auth/callback?next=${encodeURIComponent(to)}`;
  const go = (m: Mode) => { setMode(m); setErr(""); };

  // Where to land: the page they came from, or the reading they started before signing up
  const finish = useCallback(async (meta?: Record<string, unknown>) => {
    const pending = safe(meta?.pending_next);
    const to = next === DEFAULT_NEXT && pending ? pending : next;
    if (pending) await sb.auth.updateUser({ data: { pending_next: null } }).catch(() => {});
    location.href = to;
  }, [next, sb]);

  useEffect(() => { if (cooldown <= 0) return; const t = setTimeout(() => setCooldown(c => c - 1), 1000); return () => clearTimeout(t); }, [cooldown]);

  // Waiting for the confirmation email: check when they come back to this tab, and every 15 seconds for 5 minutes
  const tries = useRef(0);
  useEffect(() => {
    if (mode !== "confirm" || !email || !password) return;
    tries.current = 0;
    let stop = false;
    const check = async () => {
      if (stop || document.visibilityState !== "visible" || tries.current >= 20) return;
      tries.current++;
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (!error && data.session && !stop) { stop = true; finish(data.user?.user_metadata); }
    };
    const timer = setInterval(check, 15000);
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    return () => { stop = true; clearInterval(timer); document.removeEventListener("visibilitychange", check); window.removeEventListener("focus", check); };
  }, [mode, email, password, sb, finish]);

  async function resend() {
    if (!email) { setErr("Enter your email first."); return; }
    setBusy(true); setErr("");
    const { error } = await sb.auth.resend({ type: "signup", email, options: { emailRedirectTo: callback(next) } });
    setBusy(false);
    if (error) { setErr(/rate|many|seconds/i.test(error.message) ? "We just sent one. Wait a minute, then try again." : error.message); return; }
    setCooldown(60);
    if (mode === "resend") setMode("resent");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    if (mode === "signup") {
      const ref = document.cookie.match(/(?:^|; )vp_ref=([A-Z2-9]+)/)?.[1]; // from an invite link
      const data = { ...(ref ? { ref } : {}), ...(next !== DEFAULT_NEXT ? { pending_next: next } : {}) };
      const { data: res, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: callback(next), data } });
      setBusy(false);
      if (error) {
        if (/registered|exists/i.test(error.message)) setErr(<>You already have an account with this email. <button type="button" className="linklike" onClick={() => go("signin")}>Sign in instead</button></>);
        else if (/password/i.test(error.message)) setErr("Choose a password with at least 8 characters.");
        else setErr(error.message);
        return;
      }
      // Supabase hides "already registered" behind an empty identities list
      if (res.user && res.user.identities?.length === 0) { setErr(<>You already have an account with this email. <button type="button" className="linklike" onClick={() => go("signin")}>Sign in instead</button></>); return; }
      if (res.session) finish(res.user?.user_metadata); else { setMode("confirm"); setCooldown(60); }
    } else if (mode === "signin") {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        if (/confirm/i.test(error.message)) setErr(<>Confirm your email first: open the email we sent you, then sign in here. <button type="button" className="linklike" onClick={resend}>Send it again</button></>);
        else setErr(<>That email and password don't match. New, or never set a password? <button type="button" className="linklike" onClick={() => go("forgot")}>Set one here</button></>);
        return;
      }
      finish(data.user?.user_metadata);
    } else if (mode === "forgot") {
      // The link opens /reset-password directly, in whatever browser the email is opened in
      const { error } = await supabaseResetRequest().auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/reset-password` });
      setBusy(false);
      if (error) setErr(/rate|many/i.test(error.message) ? "Too many emails just now. Wait a few minutes and try again." : error.message);
      else setMode("resetSent");
    } else if (mode === "resend") {
      setBusy(false); await resend();
    }
  }

  // Arrived from the confirmation email while already signed in on this browser
  if (who && link === "confirmed") return (
    <div className="auth-done">
      <h2>Your email is confirmed</h2>
      <p>You're signed in as <strong>{who}</strong>.</p>
      <p><button type="button" className="btn" onClick={() => finish()}>Continue</button></p>
      <p><button type="button" className="linklike" onClick={async () => { await sb.auth.signOut(); setWho(null); go("signin"); }}>Use a different account</button></p>
    </div>
  );
  if (mode === "confirm") return (
    <div className="auth-done">
      <h2>Check your inbox</h2>
      <p>We sent a confirmation email to <strong>{email}</strong>. Tap the button in it.</p>
      <p>Then come back to this page. It will carry on by itself, or you can sign in here with your new password.</p>
      <p className="hint">Nothing there after a minute? Check spam or promotions.</p>
      {err && <p className="error">{err}</p>}
      <p>
        <button type="button" className="linklike" onClick={resend} disabled={busy || cooldown > 0}>{cooldown > 0 ? `Send it again in ${cooldown}s` : "Send it again"}</button>
        {" · "}<button type="button" className="linklike" onClick={() => go("signin")}>I've confirmed, sign in</button>
      </p>
    </div>
  );
  if (mode === "resetSent") return (
    <div className="auth-done">
      <h2>Check your inbox</h2>
      <p>We sent a link to <strong>{email}</strong> to set a new password. It works once, for about an hour.</p>
      <button type="button" className="linklike" onClick={() => go("signin")}>Back to sign in</button>
    </div>
  );
  if (mode === "resent") return (
    <div className="auth-done">
      <h2>New link sent</h2>
      <p>Check <strong>{email}</strong> for a fresh confirmation email. It replaces the old one.</p>
      <p><button type="button" className="linklike" onClick={() => go("signin")}>Already confirmed? Sign in</button></p>
    </div>
  );

  const label = mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : mode === "resend" ? "Send a new link" : "Email me a reset link";
  return (
    <>
      {link === "confirmed" && mode === "signin" && <p className="notice" role="status">Your email is confirmed. Sign in to continue.</p>}
      {mode === "resend" && <p className="notice" role="status">{link === "expired" ? "That link has expired." : "That link didn't work."} Enter your email and we'll send a new one.</p>}
      {mode !== "forgot" && mode !== "resend" && (
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => go("signup")}>Create account</button>
          <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => go("signin")}>Sign in</button>
        </div>
      )}
      <form onSubmit={submit}>
        {mode === "forgot" && link === "reset" && <p className="notice" role="status">That reset link has expired or was already used. Enter your email and we'll send a new one.</p>}
        {mode === "forgot" && <p className="hint">Enter your email and we'll send you a link to set a new password.</p>}
        <div className="field"><label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
        {(mode === "signup" || mode === "signin") && (
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
        <button className="btn" disabled={busy || (mode === "resend" && cooldown > 0)}>{busy ? "One moment…" : label}</button>
        {mode === "signin" && <p><button type="button" className="linklike" onClick={() => go("forgot")}>Forgot password?</button></p>}
        {(mode === "forgot" || mode === "resend") && <p><button type="button" className="linklike" onClick={() => go("signin")}>Back to sign in</button></p>}
      </form>
    </>
  );
}
