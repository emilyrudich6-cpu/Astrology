import type { Metadata } from "next";
import LoginForm from "@/components/LoginForm";

export const metadata: Metadata = { title: "Sign in or sign up · Vertex Point" };
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <section className="narrow" style={{ padding: "48px 24px 96px", maxWidth: 460 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Sign in or create an account</h1>
      <p className="hint">New here? Just enter your email and we'll set up your account. No password: we'll email you a sign-in link.</p>
      <LoginForm next={safeNext} />
    </section>
  );
}
