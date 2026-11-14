import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { currentUser, supabaseAdmin } from "@/lib/supabase";
import { offer, availability, OfferKey } from "@/lib/offers";
import { TIERS } from "@/lib/config";
import OfferSummary from "@/components/OfferSummary";
import BirthForm from "@/components/BirthForm";
import { BuyButton } from "@/components/BillingButtons";

export const metadata: Metadata = { title: "Checkout · Vertex Point", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One-time readings: signed in, birth details saved, then their details (synastry) and Stripe checkout */
export default async function Buy({ params, searchParams }: { params: Promise<{ product: string }>; searchParams: Promise<{ canceled?: string }> }) {
  const { product } = await params;
  if (product !== "synastry" && product !== "yearahead") notFound();
  const o = offer(product as OfferKey);
  const here = `/buy/${product}`;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(here)}`);
  const { data: profile } = await supabaseAdmin().from("profiles").select("birth_date,tier").eq("id", user.id).maybeSingle();
  if (!profile?.birth_date) redirect(`/onboarding?next=${encodeURIComponent(here)}`);
  const ok = (await availability())[o.key];
  const canceled = (await searchParams).canceled;
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px", maxWidth: 560 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>{o.label}</h1>
      <OfferSummary offer={o} step={product === "synastry" ? "Add their birth details, then pay securely with Stripe." : "Pay securely with Stripe, and it's written for you right away."} />
      {canceled && <div className="notice">Checkout was canceled, so you haven't been charged. You can try again below.</div>}
      {!ok ? (
        <p>This reading isn't available to buy right now. Please check back soon.</p>
      ) : product === "synastry" ? (
        <>
          {TIERS[profile.tier as keyof typeof TIERS]?.compatPerMonth > 0 && (
            <p className="hint">Your Deep Dive plan includes synastry readings each month. <Link href="/dashboard">Use one from Your People</Link> instead of paying.</p>
          )}
          <p>{o.blurb} <Link href="/synastry">See an example</Link>.</p>
          <h2 style={{ fontSize: "var(--step-1)" }}>Their birth details</h2>
          <BirthForm endpoint="/api/buy" extra={{ product: "synastry" }} withRelationship submitLabel={`Continue to payment, ${o.priceLine}`} />
        </>
      ) : (
        <>
          <p>{o.blurb}</p>
          <BuyButton product="yearahead" label={`Continue to payment, ${o.priceLine}`} />
        </>
      )}
      <p className="hint" style={{ marginTop: 24 }}>Your reading appears in <Link href="/dashboard">My readings</Link> as soon as it's written, usually within a few minutes. For entertainment and self-reflection.</p>
    </section>
  );
}
