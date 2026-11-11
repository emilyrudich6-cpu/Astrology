import { DateTime } from "luxon";
import { DELIVERY_DAYS, DELIVERY_HOURS } from "./config";

const rand = (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1));

/** A surprise delivery moment: a random day ahead, at a random daytime hour in the member's time zone */
export function surpriseDeliveryTime(timezone: string, from = new Date(), days = DELIVERY_DAYS): Date {
  const local = DateTime.fromJSDate(from, { zone: timezone || "UTC" })
    .plus({ days: rand(days.min, days.max) })
    .set({ hour: rand(DELIVERY_HOURS.from, DELIVERY_HOURS.to - 1), minute: rand(0, 59), second: 0, millisecond: 0 });
  return local.toUTC().toJSDate();
}

/** A random day in the next calendar month (member's time zone) for the monthly timeline */
export function nextMonthlyTimelineTime(timezone: string, from = new Date()): Date {
  const base = DateTime.fromJSDate(from, { zone: timezone || "UTC" }).plus({ months: 1 }).startOf("month");
  return base.plus({ days: rand(0, base.daysInMonth! - 1) })
    .set({ hour: rand(DELIVERY_HOURS.from, DELIVERY_HOURS.to - 1), minute: rand(0, 59) })
    .toUTC().toJSDate();
}

/** First timeline after subscribing: within the next 1-3 days, so it feels immediate but still a surprise */
export function firstTimelineTime(timezone: string, from = new Date()): Date {
  return surpriseDeliveryTime(timezone, from, { min: 1, max: 3 });
}

/** Start of the member's current calendar month, as a UTC ISO string */
export function startOfMemberMonth(timezone: string, now = new Date()): string {
  return DateTime.fromJSDate(now, { zone: timezone || "UTC" }).startOf("month").toUTC().toISO()!;
}
