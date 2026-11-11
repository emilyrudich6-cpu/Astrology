import { redirect } from "next/navigation";
import Link from "next/link";
import ChartWheel from "@/components/ChartWheel";
import AskQuestion from "@/components/AskQuestion";
import People from "@/components/People";
import PushButton from "@/components/PushButton";
import { CheckoutButton, ManageBillingButton } from "@/components/BillingButtons";
import AutoRefresh from "@/components/AutoRefresh";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { natalChart } from "@/lib/engine/natal";
import { birthFromRow } from "@/lib/pipeline";
import { startOfMemberMonth } from "@/lib/schedule";
import { TIERS, Tier, QUESTION_MENU } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ plan?: string; upgraded?: string }> }) {
  const { plan, upgraded } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard${plan ? `?plan=${plan}` : ""}`)}`);
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile?.birth_date) redirect("/onboarding");

  const tier = TIERS[profile.tier as Tier];
  const { data: readings } = await db.from("readings").select("id,kind,title,status,deliver_at,delivered_at,read_at,created_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const delivered = (readings ?? []).filter(r => r.delivered_at).sort((a, b) => b.delivered_at!.localeCompare(a.delivered_at!));
  const onTheWay = (readings ?? []).filter(r => !r.delivered_at && r.status !== "failed");
  const natalPending = onTheWay.some(r => r.kind === "natal");
  const monthStart = startOfMemberMonth(profile.timezone);
  const askedThisMonth = (readings ?? []).filter(r => r.kind === "question" && r.created_at >= monthStart).length;
  const { data: people } = await db.from("people").select("id,name,relationship").eq("user_id", user.id).order("created_at");

  const chart = natalChart(birthFromRow(profile));
  const wantPlan = plan === "timeline" || plan === "deep" ? plan : null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: profile.timezone });
  const kindLabel: Record<string, string> = { natal: "your free chart", timeline: "your monthly timeline", question: "an answer to your question", synastry: "a compatibility reading" };

  return (
    <div className="wrap dash">
      <aside>
        <ChartWheel label={`${profile.name}'s natal chart`} planets={chart.planets}
          cusps={chart.houseCusps?.map(h => h.lon)} asc={chart.angles?.[0].lon ?? null} aspects={chart.aspects} />
        <div className="panel">
          <h3>{profile.name}</h3>
          <p style={{ margin: 0 }}>☉ {chart.bigThree.sun}<br />☽ {chart.bigThree.moon}<br />AC {chart.bigThree.ascendant}</p>
          <p className="hint" style={{ marginTop: 10 }}>{profile.birth_place} · <Link href="/onboarding">Edit birth details</Link></p>
        </div>
        <div className="panel">
          <h3>Your plan: {tier.label}</h3>
          {profile.tier === "free" ? (
            <>
              <p className="hint">Upgrade for a monthly timeline{" "}or questions answered on surprise days.</p>
              <div style={{ display: "grid", gap: 10 }}>
                <CheckoutButton tier="timeline" label={`Timeline, ${TIERS.timeline.price}`} />
                <CheckoutButton tier="deep" label={`Deep Dive, ${TIERS.deep.price}`} />
              </div>
            </>
          ) : (
            <>
              {profile.tier === "timeline" && <div style={{ marginBottom: 10 }}><CheckoutButton tier="deep" label={`Upgrade to Deep Dive, ${TIERS.deep.price}`} /></div>}
              <ManageBillingButton />
            </>
          )}
        </div>
        <div className="panel">
          <h3>Arrival alerts</h3>
          <p className="hint">Readings land on surprise days. Turn on alerts so you see them right away. We always email you too.</p>
          <PushButton vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </div>
      </aside>

      <div>
        {upgraded && <div className="notice">You're in. Your first timeline arrives within the next three days, on a surprise day.</div>}
        {wantPlan && profile.tier === "free" && (
          <div className="panel">
            <h3>Finish choosing {TIERS[wantPlan].label}</h3>
            <p>{TIERS[wantPlan].blurb}</p>
            <CheckoutButton tier={wantPlan} label={`Continue to payment, ${TIERS[wantPlan].price}`} />
          </div>
        )}

        <h2>Your readings</h2>
        {natalPending && <AutoRefresh seconds={20} />}
        {onTheWay.length > 0 && (
          <p className="onway">
            On the way: {onTheWay.map(r => kindLabel[r.kind]).join(", ")}.{" "}
            {natalPending ? "Your free chart takes about two minutes to write. This page refreshes on its own." : "Each arrives on a surprise day."}
          </p>
        )}
        {delivered.length === 0 && !natalPending && <p className="onway">Nothing here yet.</p>}
        <ul className="inbox">
          {delivered.map(r => (
            <li key={r.id} className={r.read_at ? "" : "unread"}>
              <Link href={`/reading/${r.id}`}><span className="t">{r.title}</span><span className="d">{fmt(r.delivered_at!)}</span></Link>
            </li>
          ))}
        </ul>

        <section className="panel" style={{ marginTop: 32 }}>
          <h3>Ask a question</h3>
          {tier.questionsPerMonth > 0 ? (
            <AskQuestion menu={QUESTION_MENU} remaining={Math.max(0, tier.questionsPerMonth - askedThisMonth)} perMonth={tier.questionsPerMonth} />
          ) : (
            <p className="hint">Deep Dive members pick {TIERS.deep.questionsPerMonth} questions a month from the menu and get answers on surprise days.</p>
          )}
        </section>

        <section className="panel">
          <h3>Compatibility</h3>
          {tier.savedPeople > 0 ? (
            <People people={people ?? []} max={tier.savedPeople} />
          ) : (
            <p className="hint">Deep Dive members can save up to {TIERS.deep.savedPeople} people and get a compatibility reading with how your timelines line up over the next year.</p>
          )}
        </section>
      </div>
    </div>
  );
}
