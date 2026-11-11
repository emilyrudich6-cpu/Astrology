import Link from "next/link";
import ChartWheel from "@/components/ChartWheel";
import { PLANETS, lonOf, speedOf } from "@/lib/engine/core";
import { BRAND, TIERS, Tier, ONE_TIME, OneTimeKey } from "@/lib/config";
import { currentOffer } from "@/lib/stripe";

export const revalidate = 3600; // redraw the live sky every hour

export default async function Home() {
  const compat = await currentOffer("synastry").catch(() => null);
  const now = new Date();
  const sky = PLANETS.map(p => ({ name: p, lon: lonOf(p, now), retrograde: speedOf(p, now) < 0 }));
  const today = now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  return (
    <>
      <section className="wrap hero">
        <div>
          <h1>The sky doesn't repeat. Neither do you.</h1>
          <p className="lede">Get your full natal chart free. Subscribe, and your personal timeline arrives every month on a surprise day, with the exact dates your biggest transits peak.</p>
          <Link className="btn" href="/login?next=/onboarding">Get my free chart</Link>
        </div>
        <figure className="sky-now" style={{ margin: 0 }}>
          <ChartWheel planets={sky} spin label={`The planets' positions on ${today}`} />
          <figcaption>The sky right now, {today}. Every position is calculated, never guessed.</figcaption>
        </figure>
      </section>

      <section className="wrap block">
        <h2>How it works</h2>
        <ol className="steps">
          <li><h3>Enter your birth details</h3><p>Date, time and place. No birth time? You still get most of your chart.</p></li>
          <li><h3>Read your free chart</h3><p>Your big three, chart ruler, every planet, aspects, patterns, points and harmonics.</p></li>
          <li><h3>Your timeline arrives</h3><p>Once a month on a surprise day, with exact peak dates grouped into themes and windows.</p></li>
          <li><h3>Compare charts with someone</h3><p>A compatibility report shows where you click, where you clash, and how your timelines line up.</p></li>
        </ol>
      </section>

      <section className="wrap block" id="plans">
        <h2>Plans</h2>
        <div className="plans">
          {(Object.keys(TIERS) as Tier[]).map(t => {
            const tier = TIERS[t];
            return (
              <div key={t} className={`plan${t === "deep" ? " feature" : ""}`}>
                <h3>{tier.label}</h3>
                <p>{tier.blurb}</p>
                <div className="price">{tier.price}</div>
                {tier.yearlyPrice && <p className="hint" style={{ marginTop: -8 }}>or {tier.yearlyPrice}</p>}
                <ul>{tier.perks.map(p => <li key={p}>{p}</li>)}</ul>
                <Link className="btn" href={t === "free" ? "/login?next=/onboarding" : `/login?next=${encodeURIComponent(`/dashboard?plan=${t}`)}`}>
                  {t === "free" ? "Get my free chart" : `Choose ${tier.label}`}
                </Link>
              </div>
            );
          })}
        </div>
        <h3 style={{ marginTop: 48 }}>Or buy once, no subscription. Delivered in minutes.</h3>
        <ul className="once">
          {(Object.keys(ONE_TIME) as OneTimeKey[]).filter(k => ONE_TIME[k].enabled).map(k => {
            const founding = k === "synastry" && compat && compat.foundingLeft > 0;
            return (
              <li key={k}>
                <span><strong>{ONE_TIME[k].label}</strong><br /><span className="hint">{ONE_TIME[k].blurb}</span>
                  {founding && <><br /><span className="hint">Founding price for the first {ONE_TIME.synastry.founding!.limit} readers, {compat!.foundingLeft} left. Then {ONE_TIME[k].price}.</span></>}
                </span>
                <span className="price">{founding ? compat!.price : ONE_TIME[k].price}</span>
              </li>
            );
          })}
        </ul>
        <p className="hint" style={{ marginTop: 18 }}>Cancel any time from your account. {BRAND.name} is for entertainment and self-reflection.</p>
      </section>
    </>
  );
}
