import Link from "next/link";
import type { Metadata } from "next";
import { signByName } from "@/lib/signs";

type SP = { s?: string; m?: string; r?: string; n?: string };
const clean = (x?: string) => (x && signByName(x) ? x : null);
const cleanName = (n?: string) => (n ?? "").replace(/[^\p{L}\p{M} '\-]/gu, "").slice(0, 24);

export async function generateMetadata({ searchParams }: { searchParams: Promise<SP> }): Promise<Metadata> {
  const q = await searchParams;
  const s = clean(q.s), m = clean(q.m), r = clean(q.r), n = cleanName(q.n);
  const title = `${n ? `${n}'s` : "My"} Big Three · Vertex Point`;
  const desc = [s && `${s} Sun`, m && `${m} Moon`, r && `${r} Rising`].filter(Boolean).join(", ");
  const img = `/api/og/big3?${new URLSearchParams(Object.entries({ s, m, r, n }).filter(([, v]) => v) as [string, string][])}`;
  return { title, description: desc, openGraph: { title, description: desc, images: [img] }, twitter: { card: "summary_large_image", images: [img] } };
}

export default async function Share({ searchParams }: { searchParams: Promise<SP> }) {
  const q = await searchParams;
  const s = clean(q.s), m = clean(q.m), r = clean(q.r), n = cleanName(q.n);
  const cell = (lab: string, v: string | null) => {
    const info = v ? signByName(v) : null;
    return (
      <div style={info ? { ["--accent" as string]: info.accent } : undefined}>
        <span className="lab">{lab}</span>
        <span className="val">{v ?? "—"}</span>
        {info && <Link className="deg" href={`/signs/${info.slug}?tab=${lab.toLowerCase()}`}>Read {v} {lab}</Link>}
      </div>
    );
  };
  return (
    <section className="narrow" style={{ paddingBlock: "28px 40px", textAlign: "center" }}>
      <h1 className="kicker-italic" style={{ fontSize: "var(--step-3)" }}>{n ? `${n}'s Big Three` : "My Big Three"}</h1>
      <div className="big3">{cell("Sun", s)}{cell("Moon", m)}{cell("Rising", r)}</div>
      <p className="hint" style={{ margin: "18px auto 22px", maxWidth: "26rem" }}>Your Sun sign is only the beginning. See what the rest of the sky says about you.</p>
      <Link className="btn" href="/chart">Get my free chart</Link>
    </section>
  );
}
