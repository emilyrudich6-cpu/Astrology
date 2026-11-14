import type { Metadata } from "next";
import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import OfferSummary from "@/components/OfferSummary";
import { offerForNext } from "@/lib/offers";
import { currentUser } from "@/lib/supabase";

export const metadata: Metadata = { title: "Create an account or sign in · Vertex Point" };

type Link = "confirmed" | "expired" | "invalid" | "reset";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string; link?: string }> }) {
  const { next, mode, link } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  const linkState = (["confirmed", "expired", "invalid", "reset"] as const).find(l => l === link) as Link | undefined;
  const user = await currentUser();
  // Already signed in: go straight on, unless an email link sent them here and we need to explain it
  if (user && !linkState) redirect(safeNext);
  const o = offerForNext(safeNext);
  return (
    <section className="narrow" style={{ padding: "48px 24px 96px", maxWidth: 460 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>{o ? (mode === "signin" || linkState ? "Sign in to continue" : "Create your free account") : "Your Vertex Point account"}</h1>
      {o ? <OfferSummary offer={o} step="Next: your birth details, then checkout." /> : <p className="hint">Free to join. Your chart and readings are saved here.</p>}
      <LoginForm next={safeNext} initial={mode === "forgot" ? "forgot" : mode === "signin" || linkState ? "signin" : "signup"} link={linkState} signedInAs={user?.email ?? null} />
    </section>
  );
}
