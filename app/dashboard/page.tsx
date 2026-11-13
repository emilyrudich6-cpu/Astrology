import { redirect } from "next/navigation";
import Link from "next/link";
import ChartWheel from "@/components/ChartWheel";
import AskQuestion from "@/components/AskQuestion";
import People from "@/components/People";
import PushButton from "@/components/PushButton";
import { CheckoutButton, ManageBillingButton, BuyButton } from "@/components/BillingButtons";
import BuyCompatibility from "@/components/BuyCompatibility";
import { planUsedThisMonth } from "@/lib/quota";
import { currentOffer } from "@/lib/stripe";
import AutoRefresh from "@/components/AutoRefresh";
import StartFullChart from "@/components/StartFullChart";
import { currentUser, supabaseAdmin, isAdmin } from "@/lib/supabase";
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
  const writingNow = onTheWay.some(r => new Date(r.deliver_at) <= new Date()); // free chart or a paid one-off being written
  const compat = await currentOffer("synastry");
  const bonusUntil = profile.tier === "free" && profile.bonus_timeline_until && new Date(profile.bonus_timeline_until) > new Date()
    ? new Date(profile.bonus_timeline_until) : null;
  const askedThisMonth = await planUsedThisMonth(user.id, profile.timezone, "question");
  const compatThisMonth = tier.compatPerMonth ? await planUsedThisMonth(user.id, profile.timezone, "synastry") : 0;
  const { data: people } = await db.from("people").select("id,name,relationship").eq("user_id", user.id).eq("purchased", false).order("created_at");

  const chart = natalChart(birthFromRow(profile));
  const wantPlan = plan === "timeline" || plan === "deep" ? plan : null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: profile.timezone });
  const kindLabel: Record<string, string> = { natal: "your free chart", timeline: "your monthly timeline", question: "an answer to your question", synastry: "a synastry reading", yearahead: "your year-ahead timeline", fullchart: "your Full Chart" };
  const hasFullChart = (readings ?? []).some(r => r.kind === "fullchart" && r.status !== "failed");

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
              <p className="hint">Upgrade for monthly timeline updates, or Deep Dive for personalized insights and synastry with anyone you add.</p>
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
        {bought && <div className="notice">Payment received. Your {ONE_TIME[bought as keyof typeof ONE_TIME]?.label.toLowerCase() ?? "reading"} is being written and will be here in about two minutes.</div>}
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
        {writingNow && <AutoRefresh seconds={20} />}
        {bonusUntil && <div className="notice">Your free month of timeline readings runs until {fmt(bonusUntil.toISOString())}. Want it every month? <a href="/dashboard?plan=timeline">Keep my timeline, {TIERS.timeline.price}</a></div>}
        {onTheWay.length > 0 && (
          <p className="onway">
            On the way: {onTheWay.map(r => kindLabel[r.kind]).join(", ")}.{" "}
            {writingNow ? "Being written now, which takes about two minutes. This page refreshes on its own." : "Each arrives on a surprise day."}
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

        {(tier.fullChart || isAdmin(user.email)) && !hasFullChart && (
          <section className="panel" style={{ marginTop: 32 }}>
            <h3>Your Full Chart</h3>
            <p className="hint">Your whole chart, planet by planet, with fixed stars, progressions, Human Design and a two-year timeline of exact dates. It's included in your membership.</p>
            <StartFullChart />
          </section>
        )}
        {ONE_TIME.yearahead.enabled && (
          <section className="panel" style={{ marginTop: 32 }}>
            <h3>{ONE_TIME.yearahead.label}</h3>
            <p className="hint">{ONE_TIME.yearahead.blurb}</p>
            <BuyButton product="yearahead" label={`Get my year ahead, ${ONE_TIME.yearahead.price}`} />
          </section>
        )}
        <section className="panel">
          <h3>{tier.compatPerMonth > 0 ? "Your People: synastry readings" : ONE_TIME.synastry.label}</h3>
          {tier.compatPerMonth > 0 ? (
            <People people={people ?? []} max={tier.savedPeople} perMonth={tier.compatPerMonth}
              remaining={Math.max(0, tier.compatPerMonth - compatThisMonth)} extraPrice={ONE_TIME.extra.price} />
          ) : compat ? (
            <>
              <p className="hint">{ONE_TIME.synastry.blurb}</p>
              <p className="hint">Or get {TIERS.deep.compatPerMonth} synastry readings every month with <Link href="/dashboard?plan=deep">Deep Dive, {TIERS.deep.price}</Link>.</p>
              <BuyCompatibility price={compat.price} />
            </>
          ) : (
            <p className="hint">{ONE_TIME.synastry.blurb}</p>
          )}
        </section>

        <section className="panel">
          <h3>Monthly timeline and personalized insights</h3>
          {tier.questionsPerMonth > 0 || ONE_TIME.question.enabled ? (
            <AskQuestion menu={QUESTION_MENU} remaining={Math.max(0, tier.questionsPerMonth - askedThisMonth)} perMonth={tier.questionsPerMonth}
              buyPrice={ONE_TIME.question.enabled ? ONE_TIME.question.price : undefined} />
          ) : (
            <p className="hint">Deep Dive members get monthly updates of their timeline plus {TIERS.deep.questionsPerMonth} deeper, personalized insights a month, chosen from a guided menu and delivered on surprise days. <Link href="/dashboard?plan=deep">Deep Dive, {TIERS.deep.price}</Link></p>
          )}
        </section>

      </div>
    </div>
  );
}
