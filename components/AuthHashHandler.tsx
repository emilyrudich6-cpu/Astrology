"use client";
// Supabase puts some link errors after a "#" (e.g. an expired confirmation link), which the server never sees.
import { useEffect } from "react";

export default function AuthHashHandler() {
  useEffect(() => {
    const h = new URLSearchParams(location.hash.slice(1));
    const code = h.get("error_code") ?? h.get("error");
    if (!code || new URLSearchParams(location.search).get("link")) return;
    const expired = /expired/i.test(code + (h.get("error_description") ?? ""));
    location.replace(`/login?mode=signin&link=${expired ? "expired" : "invalid"}`);
  }, []);
  return null;
}
