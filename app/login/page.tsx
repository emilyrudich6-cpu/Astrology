import LoginForm from "@/components/LoginForm";
export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
  return (
    <section className="narrow" style={{ padding: "48px 24px 96px", maxWidth: 460 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Sign in</h1>
      <p className="hint">No password. We'll email you a 6-digit code.</p>
      <LoginForm next={safeNext} />
    </section>
  );
}
