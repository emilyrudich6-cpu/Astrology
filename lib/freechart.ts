// The free chart is stateless: birth details travel in the result page's own URL (never on share cards).
import type { BirthData } from "./engine/natal";

export interface FreeBirth { n?: string; d: string; t: string | null; p: string; la: number; lo: number; tz: string }

const toB64Url = (s: string) =>
  (typeof btoa === "function" ? btoa(unescape(encodeURIComponent(s))) : Buffer.from(s, "utf8").toString("base64"))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64Url = (s: string) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  return typeof atob === "function" ? decodeURIComponent(escape(atob(b))) : Buffer.from(b, "base64").toString("utf8");
};

export const encodeBirth = (b: FreeBirth) => toB64Url(JSON.stringify(b));

/** Decode and validate. Returns null for anything malformed. */
export function decodeBirth(token: string | undefined | null): (BirthData & { place: string }) | null {
  if (!token || token.length > 600) return null;
  try {
    const j = JSON.parse(fromB64Url(token)) as FreeBirth;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(j.d)) return null;
    const y = Number(j.d.slice(0, 4));
    if (y < 1900 || y > new Date().getFullYear()) return null;
    if (j.t && !/^([01]\d|2[0-3]):[0-5]\d$/.test(j.t)) return null;
    if (!Number.isFinite(j.la) || !Number.isFinite(j.lo) || Math.abs(j.la) > 90 || Math.abs(j.lo) > 180) return null;
    if (typeof j.tz !== "string" || !/^[A-Za-z_]+(\/[A-Za-z0-9_+\-]+)*$/.test(j.tz)) return null;
    return {
      name: (j.n ?? "").toString().trim().slice(0, 40) || "You",
      date: j.d, time: j.t || null, timezone: j.tz, latitude: j.la, longitude: j.lo,
      place: (j.p ?? "").toString().slice(0, 120),
    };
  } catch { return null; }
}
