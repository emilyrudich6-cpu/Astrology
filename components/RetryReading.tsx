"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Starts a failed or stalled reading again. Never charges: it restarts the reading that already exists. */
export default function RetryReading({ id, label = "Try again" }: { id: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch(`/api/readings/${id}/retry`, { method: "POST" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "That didn't start. Check your connection and try again."); setBusy(false); return; }
    router.refresh();
    setTimeout(() => setBusy(false), 4000);
  }
  return (
    <>
      <button type="button" className="btn" onClick={go} disabled={busy}>{busy ? "Starting…" : label}</button>
      {err && <p className="error" role="alert">{err}</p>}
    </>
  );
}
