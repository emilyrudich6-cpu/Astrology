"use client";
// "Unlock a free synastry reading": the inviter's link and where their reward stands.
import { useState } from "react";
import Link from "next/link";
import type { InviteState } from "@/lib/referrals";

export default function InviteCard({ link, state, signedIn = true }: { link: string | null; state: InviteState; signedIn?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const showLink = signedIn && link && ["none", "pending", "declined"].includes(state.kind);

  async function copy() {
    try { await navigator.clipboard.writeText(link!); setCopied(true); setTimeout(() => setCopied(false), 2500); }
    catch { setErr("Couldn't copy. Press and hold the link to copy it."); }
  }
  async function redeem() {
    setBusy(true); setErr("");
    const r = await fetch("/api/referral/redeem", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Something went wrong. Try again."); setBusy(false); return; }
    location.href = "/dashboard";
  }

  return (
    <section className="card invite" aria-labelledby="invite-h">
      <svg className="orbits" viewBox="0 0 160 160" aria-hidden><circle cx="62" cy="80" r="46" /><circle cx="98" cy="80" r="46" /></svg>
      <h3 id="invite-h">Unlock a free synastry reading</h3>
      <p>Invite a friend to Vertex Point. Once they sign up and create their free birth chart, you&apos;ll unlock a free synastry reading with them.</p>
      {!signedIn && <Link className="btn small" href="/login?next=%2Fsynastry">Sign in to get your invite link</Link>}
      {showLink && (
        <>
          <button type="button" className="btn small" onClick={copy}>{copied ? "Copied ♡" : "Copy invite link"}</button>
          <p className="hint invite-link">{link}</p>
        </>
      )}
      {signedIn && (
        <p className="invite-status" role="status">
          {state.kind === "none" && "No one has joined with your link yet."}
          {state.kind === "pending" && <>Pending: {state.friend} joined. Your free reading unlocks when they create their free birth chart.</>}
          {state.kind === "declined" && <>{state.friend} chose not to share their chart, so your free reading will go to the next friend who joins.</>}
          {state.kind === "ready" && "Credit ready ♡"}
          {state.kind === "waiting_share" && <>Credit ready ♡ We&apos;ve asked {state.friend} to share their chart for your reading. You can start it as soon as they say yes.</>}
          {state.kind === "writing" && <>Your free reading with {state.friend} is being written now. It&apos;ll be in your readings in a few minutes.</>}
          {state.kind === "redeemed" && <>Redeemed ✓ <Link href={`/reading/${state.readingId}`}>Read You &amp; {state.friend}</Link></>}
          {state.kind === "failed" && <>Writing your reading with {state.friend} didn&apos;t work. Try again; it&apos;s still free.</>}
        </p>
      )}
      {(state.kind === "ready" || state.kind === "failed") && (
        <div className="invite-redeem">
          {state.kind === "ready" && <p><strong>{state.friend} shared their chart.</strong> This uses your free invite reward, so there&apos;s nothing to pay.</p>}
          <button type="button" className="btn small" onClick={redeem} disabled={busy}>{busy ? "Starting…" : state.kind === "failed" ? "Try again, free" : `Write my free reading with ${state.friend}`}</button>
        </div>
      )}
      {err && <p className="error">{err}</p>}
    </section>
  );
}
