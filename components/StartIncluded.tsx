"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

/** Starts a reading that's included in the membership (no checkout) */
export default function StartIncluded({ endpoint, label }: { endpoint: string; label: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch(endpoint, { method: "POST" }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (!r?.ok) { setErr(j.error ?? "Something went wrong. Try again."); setBusy(false); return; }
    router.refresh();
  }
  return (
    <>
      <button className="btn" onClick={go} disabled={busy}>{busy ? "Starting…" : label}</button>
      {err && <p className="hint" role="status">{err}</p>}
    </>
  );
}
