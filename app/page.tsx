import Link from "next/link";
import InvitedBanner from "@/components/InvitedBanner";
import { BRAND } from "@/lib/config";
import { OFFERS, availability } from "@/lib/offers";
import NewsletterSignup from "@/components/NewsletterSignup";

export const revalidate = 3600;

function Orbits() {
  return (
    <svg className="orbits" viewBox="0 0 160 160" aria-hidden>
      <circle cx="62" cy="80" r="46" fill="none" stroke="var(--silver)" />
      <circle cx="98" cy="80" r="46" fill="none" stroke="var(--silver)" />
    </svg>
  );
}

export default async function Home() {
  const available = await availability();
  return (
    <>
      <InvitedBanner />
      <section className="wrap hero">
        <div className="hero-copy">
          <h1>You know your Sun sign.</h1>
          <p className="sub">Get to know what the rest of the sky says about you.</p>
          <p className="support">Explore a comprehensive astrological chart based on the sky at the time and place you were born.</p>
          <div className="hero-actions">
            <Link className="btn" href="/chart">Get my free chart</Link>
            <Link className="compare-link" href="/synastry">Or compare your chart with someone ♡</Link>
          </div>
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

      <section className="wrap block plans" id="plans" aria-labelledby="plans-h">
        <h2 id="plans-h">Readings &amp; Plans</h2>
        <ul className="plan-rows">
          {OFFERS.map(o => (
            <li key={o.key}>
              <div className="plan-main">
                <p className="plan-name">{o.label}</p>
                <p className="plan-blurb">{o.blurb}{o.key === "synastry" && <> <Link href="/synastry">See an example</Link></>}</p>
              </div>
              <p className="plan-price">{o.priceLine}</p>
              {available[o.key]
                ? <Link className="btn small" href={`/login?next=${encodeURIComponent(o.path)}`}>{o.key === "deep" ? "Choose Deep Dive" : "Get it"}</Link>
                : <span className="hint plan-soon">Coming soon</span>}
            </li>
          ))}
        </ul>
        <p className="hint" style={{ marginTop: 18 }}>Your birth chart is always free: <Link href="/chart">get my free chart</Link>. Members can change or cancel their plan from My readings. {BRAND.name} is for entertainment and self-reflection.</p>
      </section>

      <section className="wrap block">
        <NewsletterSignup source="home" />
      </section>
    </>
  );
}
