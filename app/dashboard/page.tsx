import { redirect } from "next/navigation";
import Link from "next/link";
import ChartWheel from "@/components/ChartWheel";
import AskQuestion from "@/components/AskQuestion";
import People from "@/components/People";
import PushButton from "@/components/PushButton";
import { CheckoutButton, ManageBillingButton, BuyButton } from "@/components/BillingButtons";
import BuyCompatibility from "@/components/BuyCompatibility";
import { planUsedThisMonth } from "@/lib/quota";
import AutoRefresh from "@/components/AutoRefresh";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { natalChart } from "@/lib/engine/natal";
import { birthFromRow } from "@/lib/pipeline";
import { TIERS, Tier, QUESTION_MENU, ONE_TIME } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ plan?: string; upgraded?: string; bought?: string }> }) {
  const { plan, upgraded, bought } = await searchParams;
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
  const askedThisMonth = await planUsedThisMonth(user.id, profile.timezone, "question");
  const { data: people } = await db.from("people").select("id,name,relationship").eq("user_id", user.id).eq("purchased", false).order("created_at");

  const chart = natalChart(birthFromRow(profile));
  const wantPlan = plan === "timeline" || plan === "deep" ? plan : null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: profile.timezone });
  const kindLabel: Record<string, string> = { natal: "your free chart", timeline: "your monthly timeline", question: "an answer to your question", synastry: "a compatibility reading", yearahead: "your year-ahead timeline" };

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
                <CheckoutButton tier="timeline" interval="year" ghost label={`Timeline, ${TIERS.timeline.yearlyPrice}`} />
                <CheckoutButton tier="deep" label={`Deep Dive, ${TIERS.deep.price}`} />
                <CheckoutButton tier="deep" interval="year" ghost label={`Deep Dive, ${TIERS.deep.yearlyPrice}`} />
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
        {bought && <div className="notice">Payment received. Your {ONE_TIME[bought as keyof typeof ONE_TIME]?.label.toLowerCase() ?? "reading"} is on its way and arrives on a surprise day.</div>}
        {wantPlan && profile.tier === "free" && (
          <div className="panel">
            <h3>Finish choosing {TIERS[wantPlan].label}</h3>
            <p>{TIERS[wantPlan].blurb}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <CheckoutButton tier={wantPlan} label={`Pay monthly, ${TIERS[wantPlan].price}`} />
              <CheckoutButton tier={wantPlan} interval="year" ghost label={`Pay yearly, ${TIERS[wantPlan].yearlyPrice}`} />
            </div>
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
          {tier.questionsPerMonth > 0 || ONE_TIME.question.enabled ? (
            <AskQuestion menu={QUESTION_MENU} remaining={Math.max(0, tier.questionsPerMonth - askedThisMonth)} perMonth={tier.questionsPerMonth}
              buyPrice={ONE_TIME.question.enabled ? ONE_TIME.question.price : undefined} />
          ) : (
            <p className="hint">Deep Dive members pick {TIERS.deep.questionsPerMonth} questions a month from the menu and get answers on surprise days.</p>
          )}
        </section>

        <section className="panel">
          <h3>Compatibility</h3>
          {tier.savedPeople > 0 ? (
            <People people={people ?? []} max={tier.savedPeople} />
          ) : ONE_TIME.synastry.enabled ? (
            <>
              <p className="hint">{ONE_TIME.synastry.blurb} Deep Dive members get {TIERS.deep.savedPeople} a month included.</p>
              <BuyCompatibility price={ONE_TIME.synastry.price} />
            </>
          ) : (
            <p className="hint">Deep Dive members can save up to {TIERS.deep.savedPeople} people and get a compatibility reading with how your timelines line up over the next year.</p>
          )}
        </section>

        {ONE_TIME.yearahead.enabled && (
          <section className="panel">
            <h3>{ONE_TIME.yearahead.label}</h3>
            <p className="hint">{ONE_TIME.yearahead.blurb}</p>
            <BuyButton product="yearahead" label={`Get my year ahead, ${ONE_TIME.yearahead.price}`} />
          </section>
        )}
      </div>
    </div>
  );
}
