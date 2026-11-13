"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartFullChart() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const router = useRouter();
  async function go() {
    setBusy(true); setErr("");
    const r = await fetch("/api/fullchart", { method: "POST" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setErr(j.error ?? "Something went wrong. Try again."); setBusy(false); return; }
    router.refresh();
  }
  return (
    <>
      <button className="btn" onClick={go} disabled={busy}>{busy ? "Starting…" : "Write my Full Chart"}</button>
      <p className="hint" role="status">{err || (busy ? "" : "It takes about three minutes to write.")}</p>
    </>
  );
}
