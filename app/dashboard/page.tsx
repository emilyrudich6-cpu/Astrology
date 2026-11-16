import { redirect } from "next/navigation";
import Link from "next/link";
import ChartWheel from "@/components/ChartWheel";
import AskQuestion from "@/components/AskQuestion";
import SavedFriends from "@/components/SavedFriends";
import { bigThree, SAVED_FRIENDS_MAX } from "@/lib/friends";
import PushButton from "@/components/PushButton";
import { CheckoutButton, ManageBillingButton, BuyButton } from "@/components/BillingButtons";
import BuyCompatibility from "@/components/BuyCompatibility";
import { planUsedThisMonth, allowanceStart } from "@/lib/quota";
import { monthAhead } from "@/lib/month-ahead";
import { currentOffer } from "@/lib/stripe";
import AutoRefresh from "@/components/AutoRefresh";
import StartFullChart from "@/components/StartFullChart";
import WritingLoader from "@/components/WritingLoader";
import { readingCards, cardState, KIND_NAME } from "@/lib/reading-status";
import Numerology from "@/components/Numerology";
import SeeingNumbersCard from "@/components/SeeingNumbersCard";
import { mostLogged } from "@/lib/seeing-numbers";
import OfferSummary from "@/components/OfferSummary";
import StripePreconnect from "@/components/StripePreconnect";
import { offer, availability } from "@/lib/offers";
import InviteCard from "@/components/InviteCard";
import SharePrompt from "@/components/SharePrompt";
import { FEATURES } from "@/lib/features";
import { getInviteCode, inviteLink, inviteStatus, sharePrompt } from "@/lib/referrals";
import { SIGN_ART } from "@/lib/sign-art";
import { currentUser, supabaseAdmin, isAdmin } from "@/lib/supabase";
import { natalChart } from "@/lib/engine/natal";
import { birthFromRow } from "@/lib/pipeline";
import { TIERS, Tier, QUESTION_MENU, ONE_TIME, AUDIO_DELIVERY_NOTE } from "@/lib/config";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ plan?: string; upgraded?: string; bought?: string; session_id?: string }> }) {
  const { plan, upgraded, bought, session_id } = await searchParams;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/dashboard${plan ? `?plan=${plan}` : ""}`)}`);
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile?.birth_date) redirect("/onboarding");

  const tier = TIERS[profile.tier as Tier];
  // Back from Stripe Checkout (/api/checkout/return has already confirmed the payment): find this purchase's own reading
  let boughtReadingId: string | null = null;
  if (bought) {
    const q = db.from("purchases").select("reading_id").eq("user_id", user.id);
    const { data: pu } = session_id ? await q.eq("stripe_session_id", session_id).maybeSingle()
      : await q.eq("product", bought).order("created_at", { ascending: false }).limit(1).maybeSingle();
    boughtReadingId = pu?.reading_id ?? null;
  }
  const { data: readings } = await db.from("readings").select("id,kind,title,status,attempts,person_id,deliver_at,delivered_at,read_at,created_at,claimed_at")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
  const delivered = (readings ?? []).filter(r => r.delivered_at).sort((a, b) => b.delivered_at!.localeCompare(a.delivered_at!));
  const onTheWay = (readings ?? []).filter(r => !r.delivered_at && r.status !== "failed");
  const natalPending = onTheWay.some(r => r.kind === "natal");
  // Each reading being written (or that failed) gets its own card with its own status
  const cards = readingCards(readings ?? []);
  const active = cards.some(c => c.state !== "failed");
  const personIds = [...new Set(cards.map(c => c.personId).filter(Boolean))] as string[];
  const { data: cardPeople } = personIds.length ? await db.from("people").select("id,name").in("id", personIds) : { data: [] as { id: string; name: string }[] };
  const whoOf = (pid: string | null) => cardPeople?.find(p => p.id === pid)?.name ?? null;
  const boughtRow = boughtReadingId ? (readings ?? []).find(r => r.id === boughtReadingId) ?? null : null;
  const boughtState = boughtRow ? cardState(boughtRow) : null;
  const boughtName = bought ? (bought === "synastry" || bought === "extra" ? KIND_NAME.synastry : ONE_TIME[bought as keyof typeof ONE_TIME]?.label ?? "reading") : "";
  const compat = await currentOffer("synastry");
  const bonusUntil = profile.tier === "free" && profile.bonus_timeline_until && new Date(profile.bonus_timeline_until) > new Date()
    ? new Date(profile.bonus_timeline_until) : null;
  const askedThisMonth = await planUsedThisMonth(user.id, profile.timezone, "question", profile.stripe_subscription_id);
  const compatThisMonth = tier.compatPerMonth ? await planUsedThisMonth(user.id, profile.timezone, "synastry", profile.stripe_subscription_id) : 0;
  const periodStart = tier.compatPerMonth ? await allowanceStart(profile.stripe_subscription_id, profile.timezone) : "";
  // The allowance renews on the member's billing day
  const renews = tier.compatPerMonth ? (() => { const d = new Date(periodStart); d.setUTCMonth(d.getUTCMonth() + 1); return d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: profile.timezone }); })() : undefined;
  const ahead = profile.tier !== "free" ? monthAhead(birthFromRow(profile)) : null;
  const { data: people } = await db.from("people").select("id,name,relationship,birth_date,birth_time,birth_place,latitude,longitude,timezone")
    .eq("user_id", user.id).eq("purchased", false).order("created_at");
  const friends = (people ?? []).map(f => ({ ...f, birth_place: f.birth_place ?? "", big3: bigThree(birthFromRow(f)) }));

  const chart = natalChart(birthFromRow(profile));
  const { data: sightings } = await db.from("journal_entries").select("number_raw,number_norm,seen_at").eq("user_id", user.id).limit(1000);
  const askShare = await sharePrompt(user.id);
  const invite = FEATURES.referrals ? { code: await getInviteCode(user.id), state: await inviteStatus(user.id) } : null;
  const wantPlan = plan === "timeline" || plan === "deep" ? plan : null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: profile.timezone });
  const kindLabel: Record<string, string> = { natal: "your chart reading", timeline: "your monthly timeline", question: "an answer to your question", synastry: "your Compatibility Reading", yearahead: "your year-ahead timeline", fullchart: "your Natal Chart Deep Dive" };
  const can = await availability(); // a buy button shows only when Stripe charges exactly the price shown
  const hasDeepDive = (readings ?? []).some(r => r.kind === "fullchart" && r.status !== "failed");
  const monthly = TIERS.deep.price.replace(" / ", "/");
  const hasFullChart = (readings ?? []).some(r => r.kind === "fullchart" && r.status !== "failed");

  return (
    <div className="wrap dash">
      <StripePreconnect />
      <aside>
        <ChartWheel label={`${profile.name}'s natal chart`} planets={chart.planets}
          cusps={chart.houseCusps?.map(h => h.lon)} asc={chart.angles?.[0].lon ?? null} aspects={chart.aspects} />
        <div className="panel">
          <h3>{profile.name}</h3>
          <p style={{ margin: 0 }}>☉ {chart.bigThree.sun}<br />☽ {chart.bigThree.moon}<br />AC {chart.bigThree.ascendant}</p>
          <p className="hint" style={{ marginTop: 10 }}>{profile.birth_place} · <Link href="/onboarding">Edit birth details</Link></p>
        </div>
      </aside>

      <div>
        {upgraded && <div className="notice">You're in. Your first timeline arrives within the next three days, on a surprise day.</div>}
        {bought && bought !== "audio" && (
          <div className="notice" role="status">
            {boughtRow?.delivered_at ? <>Your {boughtName} is ready. <Link href={`/reading/${boughtRow.id}`}>Open {boughtRow.title ?? "it"}</Link></>
              : boughtState === "failed" || boughtState === "stalled" ? <>Payment received, but your {boughtName} hit a problem while being written. Use Try again below: you won't be charged again.</>
              : boughtRow ? <>Payment received. Your {boughtName}{whoOf(boughtRow.person_id) ? ` for you and ${whoOf(boughtRow.person_id)}` : ""} is being written now.</>
              : session_id ? <>We're confirming your payment with Stripe, and your {boughtName} will start as soon as it's confirmed. If nothing changes within a minute, check that you're signed in with the email you paid with. This account is {user.email}.</>
              : <>We couldn't find a {boughtName} purchase on this account ({user.email}). If you paid while signed in with a different email, sign out and sign in with that one: your reading is tied to that account.</>}
          </div>
        )}
        {bought === "audio" && AUDIO_DELIVERY_NOTE && <div className="notice" role="status">Your audio reading is pre-ordered. {AUDIO_DELIVERY_NOTE}</div>}
        {wantPlan && TIERS[wantPlan].forSale && profile.tier === "free" && can.deep && (
          <div className="panel">
            <h3>Finish joining {TIERS[wantPlan].label}</h3>
            <OfferSummary offer={offer("deep")} step="Pay securely with Stripe. Cancel any time." />
            <CheckoutButton tier={wantPlan} label={`Join monthly, ${monthly}`} />
          </div>
        )}

        {askShare && <SharePrompt inviter={askShare.inviter} />}
        <h2 id="readings">Your readings</h2>
        {(active || (bought && session_id && !boughtRow)) && <AutoRefresh seconds={8} />}
        {bonusUntil && (
          <div className="notice">
            Your Compatibility reading came with a free month of timeline readings, until {fmt(bonusUntil.toISOString())}. It's included once, with your first Compatibility reading.
            {can.deep && <> Want it every month? <a href="/dashboard?plan=deep">Join monthly, {monthly}</a></>}
          </div>
        )}
        {cards.map(c => (
          <WritingLoader key={c.id} id={c.id} kind={c.kind} state={c.state} since={c.since} who={whoOf(c.personId)}
            sign={chart.planets[0].sign} art={SIGN_ART[chart.planets[0].sign]} />
        ))}
        {onTheWay.length > 0 && (
          <p className="onway">
            On the way: {onTheWay.map(r => kindLabel[r.kind]).join(", ")}.{" "}
            {active ? "This page refreshes on its own." : "Each arrives on a surprise day."}
          </p>
        )}
        {delivered.length === 0 && onTheWay.length === 0 && <p className="onway">Your saved readings will appear here.</p>}
        <ul className="inbox">
          {delivered.map(r => (
            <li key={r.id} className={r.read_at ? "" : "unread"}>
              <Link href={`/reading/${r.id}`}><span className="t">{r.title}</span><span className="d">{fmt(r.delivered_at!)}</span></Link>
            </li>
          ))}
        </ul>

        {ahead && (
          <section className="panel month-ahead" id="month-ahead" style={{ marginTop: 32 }}>
            <h3>Your Month Ahead</h3>
            <p className="hint">Three dates from your own transits over the next 30 days.</p>
            <ol>{ahead.items.map((x, i) => (
              <li key={i}><strong className="hl when">{x.when}</strong><br /><strong>{x.title}.</strong> {x.text}</li>
            ))}</ol>
            <p className="ask">{ahead.question}</p>
          </section>
        )}

        <section className="panel" id="friends" style={{ marginTop: 32 }}>
          <h3>{ONE_TIME.synastry.label}</h3>
          <p className="hint">{ONE_TIME.synastry.blurb} <Link href="/synastry">See an example</Link></p>
          {tier.compatPerMonth === 0 && compat && can.synastry && <BuyCompatibility price={compat.price} />}
          <h4 className="sub-h">Saved Friends</h4>
          <SavedFriends friends={friends} me={bigThree(birthFromRow(profile))} myName={profile.name || "You"} max={SAVED_FRIENDS_MAX}
            price={compat?.price ?? ONE_TIME.synastry.price}
            plan={tier.compatPerMonth > 0 ? { perMonth: tier.compatPerMonth, remaining: Math.max(0, tier.compatPerMonth - compatThisMonth), extraPrice: ONE_TIME.extra.price, renews } : null} />
        </section>

        {!hasDeepDive && (
          <section className="panel">
            <h3>{ONE_TIME.deepdive.label}</h3>
            <p className="hint">{ONE_TIME.deepdive.blurb}</p>
            {can.deepdive
              ? <BuyButton product="deepdive" label={`${ONE_TIME.deepdive.cta} · ${ONE_TIME.deepdive.price}`} />
              : <p className="hint">Coming soon.</p>}
          </section>
        )}
        {ONE_TIME.yearahead.enabled && (
          <details className="transit-drop" id="transits">
            <summary>{ONE_TIME.yearahead.label}</summary>
            <p className="hint">{ONE_TIME.yearahead.blurb}</p>
            {can.yearahead
              ? <BuyButton product="yearahead" label={`${ONE_TIME.yearahead.cta} · ${ONE_TIME.yearahead.price}`} />
              : <p className="hint">Coming soon.</p>}
          </details>
        )}
        {isAdmin(user.email) && !hasDeepDive && (
          <section className="panel">
            <h3>Natal Chart Deep Dive: admin test</h3>
            <p className="hint">Writes the Deep Dive for this account without a payment. Only admins see this.</p>
            <StartFullChart />
          </section>
        )}

        <section className="panel plan-monthly-card" id="monthly">
          <h3>{TIERS.deep.label}</h3>
          {profile.tier === "free" ? (
            <>
              <ul className="doc-list">{TIERS.deep.perks.map(x => <li key={x}>{x}</li>)}</ul>
              <p className="plan-price">{monthly}</p>
              {can.deep ? <CheckoutButton tier="deep" label={`Join monthly, ${monthly}`} /> : <p className="hint">Coming soon.</p>}
              <p className="hint" style={{ marginTop: 10 }}>You're on the free plan. Cancel any time after joining.</p>
            </>
          ) : (
            <>
              <p className="hint">You're a member{profile.tier === "timeline" ? " on the earlier Timeline plan" : ""}. Your timeline update and insights arrive in Your readings on surprise days.</p>
              {profile.tier === "timeline" && can.deep && <div style={{ marginBottom: 10 }}><CheckoutButton tier="deep" label={`Switch to ${TIERS.deep.label}, ${monthly}`} /></div>}
              {tier.questionsPerMonth > 0 && (
                <AskQuestion menu={QUESTION_MENU} remaining={Math.max(0, tier.questionsPerMonth - askedThisMonth)} perMonth={tier.questionsPerMonth}
                  buyPrice={ONE_TIME.question.enabled ? ONE_TIME.question.price : undefined} />
              )}
              <ManageBillingButton />
            </>
          )}
        </section>

        <section className="panel">
          <h3>Arrival alerts</h3>
          <p className="hint">Readings land on surprise days. Turn on alerts so you see them right away. We always email you too.</p>
          <PushButton vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </section>

        <details className="full dash-fold" id="numerology">
          <summary>Numerology &amp; number journal</summary>
          <SeeingNumbersCard top={mostLogged(sightings ?? [])} />
          <div className="panel">
            <Numerology birthDate={profile.birth_date} serverYear={new Date().getUTCFullYear()} compact />
          </div>
        </details>

        {invite && <InviteCard link={invite.code ? inviteLink(invite.code) : null} state={invite.state} />}
      </div>
    </div>
  );
}
