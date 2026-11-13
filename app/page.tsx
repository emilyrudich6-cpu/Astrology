import Link from "next/link";
import { BRAND, TIERS, Tier, ONE_TIME, OneTimeKey } from "@/lib/config";
import NewsletterSignup from "@/components/NewsletterSignup";

export const revalidate = 3600;

const PLAN_DETAIL: Record<Exclude<Tier, "free">, string> = {
  timeline: "Every month, on a surprise day, your timeline arrives with the exact dates your biggest transits peak.",
  deep: "Monthly updates of your timeline, 2 deeper, personalized insights a month, and synastry readings with anyone you add to Your People.",
};
const ONE_TIME_ORDER: OneTimeKey[] = ["synastry", "question", "yearahead"];

function Orbits() {
  return (
    <svg className="orbits" viewBox="0 0 160 160" aria-hidden>
      <circle cx="62" cy="80" r="46" fill="none" stroke="var(--silver)" />
      <circle cx="98" cy="80" r="46" fill="none" stroke="var(--silver)" />
    </svg>
  );
}

export default async function Home() {
  return (
    <>
      <section className="wrap hero">
        <div className="hero-copy">
          <h1>You know your Sun sign.</h1>
          <p className="sub">Get to know what the rest of the sky says about you.</p>
          <p className="support">Explore a comprehensive astrological chart based on the sky at the time and place you were born.</p>
          <Link className="btn" href="/chart">Get my free chart</Link>
        </div>
        <div className="hero-side">
          <figure className="hero-art">
            <picture>
              <source srcSet="/art/armillary.webp" type="image/webp" />
              <img src="/art/armillary.jpg" alt="A silver armillary sphere against a violet eclipse" width={598} height={805} />
            </picture>
          </figure>
          <Link className="link-arrow signs-link" href="/signs">Explore all 12 signs →</Link>
        </div>
      </section>

      <section className="wrap block">
        <p className="kicker-italic">And what are those stars saying right now?</p>
        <p className="hint" style={{ maxWidth: "30rem" }}>The planets keep moving after you're born. Your timeline shows when they touch your chart, down to the day.</p>
        <Link className="link-arrow" href="/chart">Check your transits →</Link>
      </section>

      <section className="wrap block">
        <div className="card meet">
          <Orbits />
          <h2>Now meet their chart ♡</h2>
          <p>A synastry reading puts both charts side by side: attraction, communication, friction and the patterns you keep repeating.</p>
          <Link className="btn ghost small" href="/synastry">See an example</Link>
        </div>
      </section>

      <section className="wrap block" id="plans">
        <h2>Readings &amp; plans</h2>
        <h3 className="group">One-time readings</h3>
        <ul className="rows">
          {ONE_TIME_ORDER.filter(k => ONE_TIME[k].enabled).map(k => {
            const isCompat = k === "synastry";
            return (
              <li key={k} className={isCompat ? "featured" : undefined}>
                <details open={isCompat}>
                  <summary><span>{ONE_TIME[k].label}{isCompat && <span className="tag">Featured</span>}</span>
                    <span className="row-price">{ONE_TIME[k].price}</span></summary>
                  <div className="row-body">
                    <p>{ONE_TIME[k].blurb}</p>
                    {isCompat && <p className="hint"><Link href="/synastry">Read a full example</Link></p>}
                    <Link className="btn small" href={`/login?next=${encodeURIComponent("/dashboard")}`}>{isCompat ? "Get my synastry reading" : "Buy once"}</Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <h3 className="group">Memberships</h3>
        <ul className="rows">
          {(["timeline", "deep"] as const).map(t => {
            const tier = TIERS[t];
            return (
              <li key={t}>
                <details>
                  <summary><span>{tier.label}<span className="row-sub">{t === "deep" ? `Timeline updates, ${tier.questionsPerMonth} personalized insights and ${tier.compatPerMonth} synastry readings a month` : "Your personal timeline every month"}</span></span><span className="row-price">{tier.price}</span></summary>
                  <div className="row-body">
                    <p>{PLAN_DETAIL[t]}</p>
                    {tier.yearlyPrice && <p className="hint">or {tier.yearlyPrice}</p>}
                    <ul className="perks">{tier.perks.map(p => <li key={p}>{p}</li>)}</ul>
                    <Link className="btn small" href={`/login?next=${encodeURIComponent(`/dashboard?plan=${t}`)}`}>Choose {tier.label}</Link>
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
        <p className="hint" style={{ marginTop: 18 }}>Your birth chart is always free. Cancel memberships any time from your account. {BRAND.name} is for entertainment and self-reflection.</p>
      </section>

      <section className="wrap block">
        <NewsletterSignup source="home" />
      </section>
    </>
  );
}
