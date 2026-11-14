"use client";
import { useState } from "react";

/** Asks the invited friend before their chart is used in the inviter's synastry reading */
export default function SharePrompt({ inviter }: { inviter: string }) {
  const [done, setDone] = useState<null | boolean>(null);
  const [busy, setBusy] = useState(false);
  async function answer(share: boolean) {
    setBusy(true);
    const r = await fetch("/api/referral/share", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ share }) });
    setBusy(false);
    if (r.ok) setDone(share);
  }
  if (done !== null) return <div className="panel share-prompt" role="status"><p>{done ? `Thanks! ${inviter} can now get a synastry reading with you.` : `Got it. Your chart stays private.`}</p></div>;
  return (
    <div className="panel share-prompt">
      <h3>Share your chart with {inviter}?</h3>
      <p>{inviter} invited you to Vertex Point and can get a free synastry reading with you. Sharing lets that reading use your birth date, time and place. Only {inviter} sees the reading.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn small" disabled={busy} onClick={() => answer(true)}>Share my chart with {inviter}</button>
        <button className="btn ghost small" disabled={busy} onClick={() => answer(false)}>No thanks</button>
      </div>
    </div>
  );
}
