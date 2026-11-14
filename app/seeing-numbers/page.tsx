import type { Metadata } from "next";
import Link from "next/link";
import SeeingNumbers from "@/components/SeeingNumbers";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { ENTRY_FIELDS } from "@/lib/journal";
import { FEATURES, hasDeepDive, journalCap } from "@/lib/features";

export const metadata: Metadata = { title: "Seeing Numbers · Vertex Point", description: "A private journal for the numbers you keep seeing." };
export const dynamic = "force-dynamic";

const NEXT = encodeURIComponent("/seeing-numbers");

export default async function Page() {
  const user = await currentUser();
  const intro = (
    <>
      <h1 style={{ fontSize: "var(--step-3)" }}>Seeing Numbers</h1>
      <p className="hint">Keep seeing 444, 12:12 or 1133? Write down what you saw and what was on your mind. Over time you'll see which numbers show up, and when.</p>
    </>
  );
  if (!user) return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      {intro}
      <div className="panel" style={{ marginTop: 22 }}>
        <p>Your journal is private and saved to your free account, so it's there on any phone or computer.</p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link className="btn" href={`/login?next=${NEXT}`}>Create a free account</Link>
          <Link className="btn ghost" href={`/login?mode=signin&next=${NEXT}`}>Sign in</Link>
        </div>
      </div>
    </section>
  );
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("id,tier").eq("id", user.id).maybeSingle();
  if (!profile) return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      {intro}
      <div className="panel" style={{ marginTop: 22 }}>
        <p>One quick step first: add your birth details so your journal can sit next to your chart.</p>
        <Link className="btn" href={`/onboarding?next=${NEXT}`}>Add my birth details</Link>
      </div>
    </section>
  );
  const { data: entries } = await db.from("journal_entries").select(ENTRY_FIELDS).eq("user_id", user.id).order("seen_at", { ascending: false }).limit(500);
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      {intro}
      <SeeingNumbers initial={entries ?? []} cap={journalCap(profile.tier)} compare={FEATURES.journalCompare} deep={hasDeepDive(profile.tier)} />
    </section>
  );
}
