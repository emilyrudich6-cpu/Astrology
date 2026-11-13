import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Create an account or sign in · Vertex Point" };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const { next, mode } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <section className="narrow" style={{ padding: "48px 24px 96px", maxWidth: 460 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Your Vertex Point account</h1>
      <p className="hint">Free to join. Your chart and readings are saved here.</p>
      <LoginForm next={safeNext} initial={mode === "signin" ? "signin" : "signup"} />
    </section>
  );
}
