import { NextResponse } from "next/server";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { QUESTION_MENU, TIERS, Tier } from "@/lib/config";
import { surpriseDeliveryTime } from "@/lib/schedule";
import { planUsedThisMonth } from "@/lib/quota";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { category, question } = await req.json().catch(() => ({}));
  const cat = QUESTION_MENU.find(c => c.key === category);
  if (!cat || !cat.questions.includes(question)) return NextResponse.json({ error: "Pick a question from the menu." }, { status: 400 });
  const db = supabaseAdmin();
  const { data: p } = await db.from("profiles").select("tier,timezone").eq("id", user.id).single();
  const allowed = p ? TIERS[p.tier as Tier].questionsPerMonth : 0;
  if (!allowed) return NextResponse.json({ error: "Questions are part of the Deep Dive plan." }, { status: 403 });
  const used = await planUsedThisMonth(user.id, p!.timezone, "question");
  if (used >= allowed) return NextResponse.json({ error: `You've asked all ${allowed} questions for this month.` }, { status: 429 });
  await db.from("readings").insert({
    user_id: user.id, kind: "question", category: cat.key, question, title: question,
    deliver_at: surpriseDeliveryTime(p!.timezone).toISOString(),
  });
  return NextResponse.json({ ok: true });
}
