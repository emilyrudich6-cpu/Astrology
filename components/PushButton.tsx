"use client";
import { useEffect, useState } from "react";

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
};

export default function PushButton({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<"checking" | "unsupported" | "ios-install" | "off" | "on" | "blocked">("checking");
  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState(ios && !standalone ? "ios-install" : "unsupported"); return; }
    if (Notification.permission === "denied") { setState("blocked"); return; }
    navigator.serviceWorker.register("/sw.js").then(async reg => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    });
  }, []);

  async function enable() {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") { setState("blocked"); return; }
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapidKey) });
    await fetch("/api/push", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(sub) });
    setState("on");
  }

  if (!vapidKey) return <p className="hint">Phone alerts aren't switched on for this site yet.</p>;
  if (state === "on") return <p className="hint">Alerts are on for this device.</p>;
  if (state === "blocked") return <p className="hint">Alerts are blocked. Turn them on for this site in your browser settings.</p>;
  if (state === "ios-install") return <p className="hint">On iPhone: tap Share, then Add to Home Screen, open the site from your home screen and come back here.</p>;
  if (state === "unsupported") return <p className="hint">This browser can't show alerts. You'll still get an email.</p>;
  return <button className="btn small" disabled={state === "checking"} onClick={enable}>Turn on alerts</button>;
}
