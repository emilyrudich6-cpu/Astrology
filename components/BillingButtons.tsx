"use client";
import { useState } from "react";

async function go(url: string, body?: object) {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  if (j.url) location.href = j.url; else alert(j.error ?? "Payments aren't set up yet.");
}
export function CheckoutButton({ tier, label, interval = "month", ghost }: { tier: string; label: string; interval?: "month" | "year"; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  return <button className={ghost ? "btn ghost" : "btn"} disabled={busy} onClick={async () => { setBusy(true); await go("/api/checkout", { tier, interval }); setBusy(false); }}>{busy ? "Opening checkout…" : label}</button>;
}
export function BuyButton({ product, label }: { product: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return <button className="btn ghost" disabled={busy} onClick={async () => { setBusy(true); await go("/api/buy", { product }); setBusy(false); }}>{busy ? "Opening checkout…" : label}</button>;
}
export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  return <button className="btn ghost small" disabled={busy} onClick={async () => { setBusy(true); await go("/api/portal"); setBusy(false); }}>Manage or cancel my plan</button>;
}
