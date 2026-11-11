import { IANAZone, DateTime } from "luxon";

export interface BirthInput {
  name: string; birth_date: string; birth_time: string | null; birth_place: string;
  latitude: number; longitude: number; timezone: string;
}

/** Returns clean birth data, or an error message a member can act on */
export function parseBirth(body: any): { ok: true; value: BirthInput } | { ok: false; error: string } {
  const name = String(body?.name ?? "").trim().slice(0, 60);
  const date = String(body?.birth_date ?? "");
  const time = body?.birth_time ? String(body.birth_time) : null;
  const lat = Number(body?.latitude), lon = Number(body?.longitude);
  const tz = String(body?.timezone ?? "");
  if (!name) return { ok: false, error: "Add a name." };
  const d = DateTime.fromISO(date);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !d.isValid || d.year < 1900 || d > DateTime.now()) return { ok: false, error: "Enter a birth date between 1900 and today." };
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return { ok: false, error: "Enter the birth time as hours and minutes." };
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180 || !IANAZone.isValidZone(tz))
    return { ok: false, error: "Pick the birthplace from the list so we know its exact location." };
  return { ok: true, value: { name, birth_date: date, birth_time: time, birth_place: String(body?.birth_place ?? "").slice(0, 120), latitude: lat, longitude: lon, timezone: tz } };
}
