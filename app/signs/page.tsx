import Link from "next/link";
import type { Metadata } from "next";
import { SIGN_INFO } from "@/lib/signs";
import { SIGN_ART } from "@/lib/sign-art";

export const metadata: Metadata = { title: "The 12 signs · Vertex Point", description: "Each sign as a Sun, a Moon and a Rising." };

export default function Signs() {
  return (
    <section className="wrap" style={{ paddingBlock: "28px 40px" }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>The 12 signs</h1>
      <p className="hint" style={{ maxWidth: "32rem", marginBottom: 24 }}>Every sign shows up three ways: as your Sun, your Moon and your Rising. Pick one to read all three.</p>
      <div className="sign-grid">
        {SIGN_INFO.map(s => (
          SIGN_ART[s.name] ? (
            <Link key={s.slug} href={`/signs/${s.slug}`} className="sign-card" aria-label={`${s.name}, ${s.dates}`}>
              <img src={SIGN_ART[s.name]} alt="" width={400} height={600} loading="lazy" />
            </Link>
          ) : (
            <Link key={s.slug} href={`/signs/${s.slug}`} className="sign-tile" style={{ ["--accent" as string]: s.accent }}>
              <span className="glyph" aria-hidden>{s.glyph + "︎"}</span>
              <span className="nm">{s.name}</span>
              <span className="dt">{s.dates}</span>
            </Link>
          )
        ))}
      </div>
    </section>
  );
}
