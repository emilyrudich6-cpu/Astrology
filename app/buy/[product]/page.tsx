import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { offer, availability, OfferKey } from "@/lib/offers";
import { TIERS } from "@/lib/config";
import OfferSummary from "@/components/OfferSummary";
import StripePreconnect from "@/components/StripePreconnect";
import BirthForm from "@/components/BirthForm";
import { BuyButton } from "@/components/BillingButtons";

export const metadata: Metadata = { title: "Checkout · Vertex Point", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One-time readings: signed in, birth details saved, then their details (synastry) and Stripe checkout */
export default async function Buy({ params, searchParams }: { params: Promise<{ product: string }>; searchParams: Promise<{ canceled?: string; friend?: string }> }) {
  const { product } = await params;
  if (product !== "synastry" && product !== "yearahead" && product !== "deepdive") notFound();
  const o = offer(product as OfferKey);
  const here = `/buy/${product}`;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  const { canceled, friend: friendId } = await searchParams;
  const db = supabaseAdmin();
  const { data: profile } = await db.from("profiles").select("birth_date,tier,name").eq("id", user.id).maybeSingle();
  if (!profile?.birth_date) redirect(`/onboarding?next=${encodeURIComponent(here)}`);
  const ok = (await availability())[o.key];
  // One Deep Dive per account: anyone who already has theirs is sent to it, not to checkout
  const { data: mine } = product === "deepdive"
    ? await db.from("readings").select("id,delivered_at").eq("user_id", user.id).eq("kind", "fullchart").neq("status", "failed").limit(1).maybeSingle()
    : { data: null };
  // From Saved Friends: both people are already known
  const { data: friend } = product === "synastry" && friendId
    ? await db.from("people").select("id,name,birth_date,birth_time,birth_place").eq("id", friendId).eq("user_id", user.id).eq("purchased", false).maybeSingle()
    : { data: null };
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px", maxWidth: 560 }}>
      <StripePreconnect />
      <h1 style={{ fontSize: "var(--step-3)" }}>{o.label}</h1>
      <OfferSummary offer={o} step={product === "synastry" ? "Add their birth details, then pay securely with Stripe." : "Pay securely with Stripe, and it's written for you right away."} />
      {canceled && <div className="notice">Checkout was canceled, so you haven't been charged. You can try again below.</div>}
      {mine ? (
        <>
          <p>You already have your Natal Chart Deep Dive, so there's nothing to pay.</p>
          <Link className="btn" href={mine.delivered_at ? `/reading/${mine.id}` : "/dashboard"}>{mine.delivered_at ? "Open my Deep Dive" : "Go to my readings"}</Link>
        </>
      ) : !ok ? (
        <p>This reading isn't available to buy right now. Please check back soon.</p>
      ) : product === "synastry" ? (
        <>
          {TIERS[profile.tier as keyof typeof TIERS]?.compatPerMonth > 0 && (
            <p className="hint">Your Vertex Point Monthly plan includes compatibility readings each month. <Link href="/dashboard#friends">Use one from Saved Friends</Link> instead of paying.</p>
          )}
          <p>{o.blurb} <Link href="/synastry">See an example</Link>.</p>
          {friend ? (
            <div className="buy-pair">
              <h2 style={{ fontSize: "var(--step-1)" }}>{profile.name || "You"} and {friend.name}</h2>
              <p className="hint">{friend.name}: born {friend.birth_date}{friend.birth_time ? ` at ${friend.birth_time}` : ", birth time unknown"}{friend.birth_place ? `, ${friend.birth_place}` : ""}. From your Saved Friends.</p>
              <BuyButton product="synastry" friendId={friend.id} label={`${o.cta} · ${o.price}`} />
              <p className="hint"><Link href="/buy/synastry">Compare with someone else instead</Link></p>
            </div>
          ) : (
            <>
              {friendId && <div className="notice">We couldn't find that saved friend, so enter their details below.</div>}
              <h2 style={{ fontSize: "var(--step-1)" }}>Their birth details</h2>
              <BirthForm endpoint="/api/buy" extra={{ product: "synastry" }} withRelationship submitLabel={`${o.cta} · ${o.price}`} />
            </>
          )}
        </>
      ) : (
        <>
          <p>{o.blurb}{product === "deepdive" && <> <Link href="/deep-dive">See an example</Link>.</>}</p>
          <BuyButton product={product as "yearahead" | "deepdive"} label={`${o.cta} · ${o.price}`} />
        </>
      )}
      <p className="hint" style={{ marginTop: 24 }}>Your reading appears in <Link href="/dashboard">My readings</Link> as soon as it's written, usually within a few minutes. This is a single payment. For entertainment and self-reflection.</p>
    </section>
  );
}
