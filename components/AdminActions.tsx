"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminActions({ id, failed, pending }: { id?: string; failed?: boolean; pending?: boolean }) {
  const [busy, setBusy] = useState("");
  const router = useRouter();
  const act = async (action: string) => {
    setBusy(action);
    const r = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, id }) });
    const j = await r.json().catch(() => ({}));
    setBusy("");
    if (!id) alert(`Written: ${j.written ?? 0}. Delivered: ${j.delivered ?? 0}. New timelines scheduled: ${j.scheduledTimelines ?? 0}.`);
    router.refresh();
  };
  if (!id) return <button className="btn small" disabled={!!busy} onClick={() => act("run")}>{busy ? "Running…" : "Run deliveries now"}</button>;
  return (
    <span style={{ display: "flex", gap: 6 }}>
      {failed && <button className="btn ghost small" disabled={!!busy} onClick={() => act("retry")}>{busy ? "…" : "Retry"}</button>}
      {pending && !failed && <button className="btn ghost small" disabled={!!busy} onClick={() => act("send-now")}>{busy ? "…" : "Send now"}</button>}
    </span>
  );
}
