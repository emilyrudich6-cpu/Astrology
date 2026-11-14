"use client";
import { useState } from "react";

/** Returns true when the browser is on its way to Stripe (keep the button in its "opening" state) */
async function go(url: string, body?: object): Promise<boolean> {
  const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (j.url) { location.href = j.url; return true; }
  alert(j.error ?? "Couldn't open checkout. Check your connection and try again.");
  return false;
}
const OPENING = "Opening secure checkout…";
export function CheckoutButton({ tier, label, interval = "month", ghost }: { tier: string; label: string; interval?: "month" | "year"; ghost?: boolean }) {
  const [busy, setBusy] = useState(false);
  return <button className={ghost ? "btn ghost" : "btn"} disabled={busy} onClick={async () => { setBusy(true); if (!(await go("/api/checkout", { tier, interval }))) setBusy(false); }}>{busy ? OPENING : label}</button>;
}
export function BuyButton({ product, label }: { product: string; label: string }) {
  const [busy, setBusy] = useState(false);
  return <button className="btn ghost" disabled={busy} onClick={async () => { setBusy(true); if (!(await go("/api/buy", { product }))) setBusy(false); }}>{busy ? OPENING : label}</button>;
}
export function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  return <button className="btn ghost small" disabled={busy} onClick={async () => { setBusy(true); if (!(await go("/api/portal"))) setBusy(false); }}>{busy ? "Opening billing…" : "Manage or cancel my plan"}</button>;
}
