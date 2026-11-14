// Server helpers for the Seeing Numbers journal. Journal text is never logged.
import { DateTime } from "luxon";
import { normalizeNumber } from "./seeing-numbers";

export const ENTRY_FIELDS = "id,number_raw,number_norm,seen_at,seen_local_date,seen_local_time,seen_tz,note,created_at,updated_at";

export interface JournalInput { number: string; seenLocal: string; tz: string; note?: string }
export interface CleanEntry {
  number_raw: string; number_norm: string; seen_at: string; seen_local_date: string; seen_local_time: string; seen_tz: string; note: string | null;
}

/** Validates a form submission. seenLocal is the wall-clock time where it was seen ("2026-11-13T12:12"). */
export function cleanEntry(body: any): { ok: true; value: CleanEntry; today: string } | { ok: false; error: string } {
  const raw = String(body?.number ?? "").trim();
  const norm = normalizeNumber(raw);
  if (!norm) return { ok: false, error: "Enter the number you saw, like 444, 12:12 or 1133." };
  const tz = String(body?.tz ?? "");
  if (!tz || !DateTime.local().setZone(tz).isValid) return { ok: false, error: "We couldn't read your time zone. Refresh and try again." };
  const local = String(body?.seenLocal ?? "");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return { ok: false, error: "Choose when you saw it." };
  const dt = DateTime.fromISO(local, { zone: tz });
  if (!dt.isValid) return { ok: false, error: "Choose when you saw it." };
  if (dt.year < 1900 || dt > DateTime.now().plus({ hours: 12 })) return { ok: false, error: "That date is in the future. Choose when you saw it." };
  const note = String(body?.note ?? "").trim().slice(0, 1000);
  return {
    ok: true,
    value: {
      number_raw: raw.slice(0, 20), number_norm: norm, seen_at: dt.toUTC().toISO()!,
      // The calendar date comes from what was typed, so time zones can't move it to another day
      seen_local_date: local.slice(0, 10), seen_local_time: local.slice(11, 16), seen_tz: tz, note: note || null,
    },
    today: DateTime.now().setZone(tz).toISODate()!,
  };
}
