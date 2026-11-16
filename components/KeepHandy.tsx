"use client";
import { useEffect, useState } from "react";

/** "Keep this page handy": a browser can't add a bookmark for someone, so this shows the two taps that do it on their device. */
export default function KeepHandy({ what = "this page" }: { what?: string }) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<"ios" | "android" | "desktop">("desktop");
  useEffect(() => {
    const ua = navigator.userAgent;
    setDevice(/iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "desktop");
  }, []);
  const steps = device === "ios" ? "Tap the Share button, then “Add to Home Screen”. It opens like an app."
    : device === "android" ? "Tap the ⋮ menu, then “Add to Home screen”. It opens like an app."
    : `Press ${typeof navigator !== "undefined" && /Mac/.test(navigator.userAgent) ? "⌘D" : "Ctrl+D"} to bookmark ${what}.`;
  return (
    <span className="keep-handy">
      <button type="button" className="linklike" aria-expanded={open} onClick={() => setOpen(o => !o)}>Bookmark {what}</button>
      {open && <span className="hint keep-handy-tip" role="status">{steps}</span>}
    </span>
  );
}
