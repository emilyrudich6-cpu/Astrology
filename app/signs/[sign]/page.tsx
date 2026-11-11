import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SIGN_INFO, signBySlug } from "@/lib/signs";
import SignEmblem from "@/components/SignEmblem";

type Tab = "sun" | "moon" | "rising";
const TABS: { key: Tab; label: string }[] = [{ key: "sun", label: "Sun" }, { key: "moon", label: "Moon" }, { key: "rising", label: "Rising" }];
const LEAD: Record<Tab, string> = { sun: "Who you're becoming", moon: "What you need to feel safe", rising: "How the world first meets you" };

export function generateStaticParams() { return SIGN_INFO.map(s => ({ sign: s.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ sign: string }> }): Promise<Metadata> {
  const s = signBySlug((await params).sign);
  return s ? { title: `${s.name} · Vertex Point`, description: `${s.name} as a Sun, a Moon and a Rising sign.` } : {};
}

export default async function SignPage({ params, searchParams }: { params: Promise<{ sign: string }>; searchParams: Promise<{ tab?: string }> }) {
  const s = signBySlug((await params).sign);
  if (!s) notFound();
  const t = (await searchParams).tab;
  const tab: Tab = t === "moon" || t === "rising" ? t : "sun";
  const i = SIGN_INFO.indexOf(s);
  const prev = SIGN_INFO[(i + 11) % 12], next = SIGN_INFO[(i + 1) % 12];
  return (
    <section className="narrow" style={{ paddingBottom: 40, ["--accent" as string]: s.accent }}>
      <div className="sign-hero">
        <SignEmblem glyph={s.glyph} accent={s.accent} label={`${s.name} emblem`} />
        <h1>{s.name}</h1>
        <div className="rule"><span className="hint">{s.dates}</span></div>
      </div>
      <nav className="tabs" aria-label={`${s.name} placements`}>
        {TABS.map(x => (
          <Link key={x.key} href={`/signs/${s.slug}${x.key === "sun" ? "" : `?tab=${x.key}`}`} aria-current={tab === x.key ? "page" : undefined} scroll={false}>{x.label}</Link>
        ))}
      </nav>
      <article className="sign-body">
        <h2>{s.name} {TABS.find(x => x.key === tab)!.label}</h2>
        <p className="sign-lead">{LEAD[tab]}</p>
        <p>{s[tab]}</p>
        <p className="hint">A {s.modality.toLowerCase()} {s.element.toLowerCase()} sign, ruled by {s.ruler}.</p>
      </article>
      <aside className="season">
        <h3>{s.name} season</h3>
        <p>{s.season}</p>
      </aside>
      <div className="card" style={{ marginTop: 28 }}>
        <h3>Your {s.name} is only one part of the sky</h3>
        <p>See where your Moon, Rising and every planet were when you were born.</p>
        <Link className="btn" href="/chart">Get my free chart</Link>
      </div>
      <nav className="sign-pager" aria-label="More signs">
        <Link href={`/signs/${prev.slug}`}>← {prev.name}</Link>
        <Link href="/signs">All signs</Link>
        <Link href={`/signs/${next.slug}`}>{next.name} →</Link>
      </nav>
    </section>
  );
}
