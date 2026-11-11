import { surpriseDeliveryTime, nextMonthlyTimelineTime, firstTimelineTime, startOfMemberMonth } from "../lib/schedule";
import { md } from "../lib/markdown";
import { DateTime } from "luxon";
const now = new Date("2026-11-11T08:00:00Z"); const tz = "America/Los_Angeles";
const local = (d: Date) => DateTime.fromJSDate(d, { zone: tz }).toFormat("yyyy-MM-dd HH:mm");
let bad = 0;
for (let i = 0; i < 2000; i++) {
  const s = surpriseDeliveryTime(tz, now), dl = DateTime.fromJSDate(s, { zone: tz });
  const days = dl.startOf("day").diff(DateTime.fromJSDate(now, { zone: tz }).startOf("day"), "days").days;
  if (days < 2 || days > 9 || dl.hour < 10 || dl.hour > 19) bad++;
  const m = DateTime.fromJSDate(nextMonthlyTimelineTime(tz, now), { zone: tz });
  if (m.month !== 12 || m.year !== 2026) bad++;
}
console.log("schedule violations:", bad);
console.log("samples:", local(surpriseDeliveryTime(tz, now)), local(nextMonthlyTimelineTime(tz, now)), local(firstTimelineTime(tz, now)), startOfMemberMonth(tz, now));
console.log(md("[good](https://x.com) [bad](javascript:alert(1)) <img src=x onerror=alert(1)>"));
