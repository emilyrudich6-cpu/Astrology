import { redirect } from "next/navigation";
import BirthForm from "@/components/BirthForm";
import { currentUser, supabaseAdmin } from "@/lib/supabase";

export default async function Onboarding() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/onboarding");
  const { data: p } = await supabaseAdmin().from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (
    <section className="narrow" style={{ padding: "32px 24px 96px", maxWidth: 560 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>{p?.birth_date ? "Your birth details" : "Let's find your chart"}</h1>
      <p className="hint">Use the time on your birth certificate if you can. Your free chart is written from these details, so double-check them.</p>
      <BirthForm endpoint="/api/profile" submitLabel={p?.birth_date ? "Save details" : "Write my free chart"} initial={p ?? undefined} />
    </section>
  );
}
