import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser, isAdmin, supabaseAdmin } from "@/lib/supabase";
import { md } from "@/lib/markdown";
import ReadingBody from "@/components/reading/ReadingBody";

export const dynamic = "force-dynamic";

export default async function Reading({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=/reading/${id}`);
  const db = supabaseAdmin();
  const { data: r } = await db.from("readings").select("*").eq("id", id).maybeSingle();
  const admin = isAdmin(user.email);
  if (!r || (!admin && (r.user_id !== user.id || !r.delivered_at))) notFound();
  if (!r.body) return <section className="narrow reading"><p>This reading hasn't been written yet.</p></section>;
  if (r.user_id === user.id && !r.read_at) await db.from("readings").update({ read_at: new Date().toISOString() }).eq("id", id);
  return (
    <section className={`reading ${r.body.startsWith('{"v":') ? "" : "narrow"}`}>
      <p className="narrow no-print"><Link href="/dashboard">Back to my readings</Link></p>
      {admin && !r.delivered_at && <div className="notice narrow">Admin preview: not delivered yet (due {new Date(r.deliver_at).toLocaleString()}).</div>}
      {r.body.startsWith('{"v":') ? <ReadingBody body={r.body} /> : <article dangerouslySetInnerHTML={{ __html: md(r.body) }} />}
    </section>
  );
}
