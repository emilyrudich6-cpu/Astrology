import { NextResponse } from "next/server";
import { Resend } from "resend";
import { BRAND } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase";
import { decodeBirth } from "@/lib/freechart";
export const runtime = "nodejs";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vertexpoint.talk";

export async function POST(req: Request) {
  const { email, b } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !/^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(email.trim()))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const birth = decodeBirth(typeof b === "string" ? b : null);
  if (!birth) return NextResponse.json({ error: "We couldn't read those birth details." }, { status: 400 });
  const link = `${SITE}/chart/result?b=${b}`;
  const to = email.trim().toLowerCase();
  let sent = false;
  if (process.env.RESEND_API_KEY) {
    try {
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: `${BRAND.name} <${BRAND.emailFrom}>`, to, subject: "Your chart from Vertex Point",
        html: `<p>Here's the link to your chart. It recalculates from your birth details every time you open it.</p><p><a href="${link}">Open my chart</a></p><p style="color:#777;font-size:12px">${BRAND.disclaimer}</p>`,
      });
      sent = true;
    } catch (e) { console.error("chart email", e); }
  }
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await supabaseAdmin().from("chart_emails").insert({ email: to, chart_link: link, sent }).then(() => {}, e => console.error(e));
  }
  if (!sent) return NextResponse.json({ error: "Email isn't switched on yet. Bookmark this page to come back to your chart." }, { status: 503 });
  return NextResponse.json({ ok: true });
}
