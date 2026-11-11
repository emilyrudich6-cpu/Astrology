import { Resend } from "resend";
import webpush from "web-push";
import { BRAND } from "./config";
import { supabaseAdmin } from "./supabase";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export async function notifyReadingArrived(userId: string, email: string | null, readingId: string, title: string) {
  const url = `${SITE}/reading/${readingId}`;
  const results: string[] = [];

  if (email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${BRAND.name} <${BRAND.emailFrom}>`,
        to: email,
        subject: "✨ Your reading just arrived",
        html: `<div style="font-family:Georgia,serif;max-width:520px;margin:auto;padding:32px;background:#0f0b1e;color:#efe7ff;border-radius:16px">
          <p style="letter-spacing:.2em;font-size:12px;color:#c9a96e;text-transform:uppercase">${BRAND.name}</p>
          <h1 style="font-weight:normal;font-size:26px">Your reading is here</h1>
          <p style="font-size:17px">${escapeHtml(title)}</p>
          <p><a href="${url}" style="display:inline-block;background:#c9a96e;color:#0f0b1e;padding:12px 22px;border-radius:999px;text-decoration:none">Open my reading</a></p>
          <p style="font-size:12px;color:#9b8fbf">${BRAND.disclaimer}</p></div>`,
      });
      results.push("email");
    } catch (e) { console.error("email failed", e); }
  }

  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(`mailto:${process.env.VAPID_CONTACT_EMAIL ?? BRAND.emailFrom}`, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const db = supabaseAdmin();
    const { data: subs } = await db.from("push_subscriptions").select("*").eq("user_id", userId);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, JSON.stringify({ title: "✨ Your reading arrived", body: title, url }));
        results.push("push");
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
  }
  return results;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
