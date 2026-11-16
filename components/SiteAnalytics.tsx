"use client";
import { Analytics } from "@vercel/analytics/next";

/** Visitor counts and page views for Vercel Analytics (no cookies).
 *  Everything after "?" or "#" is cut from each address first, so birth details in a chart link,
 *  checkout references and password-reset links are never sent. */
export default function SiteAnalytics() {
  return <Analytics beforeSend={e => ({ ...e, url: e.url.split("?")[0].split("#")[0] })} />;
}
