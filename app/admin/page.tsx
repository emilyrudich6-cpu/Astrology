import { notFound } from "next/navigation";
import Link from "next/link";
import { currentUser, isAdmin, supabaseAdmin } from "@/lib/supabase";
import AdminActions from "@/components/AdminActions";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const user = await currentUser();
  if (!isAdmin(user?.email)) notFound();
  const db = supabaseAdmin();
  const { data: members } = await db.from("profiles").select("tier");
  const counts = (members ?? []).reduce<Record<string, number>>((a, m) => ({ ...a, [m.tier]: (a[m.tier] ?? 0) + 1 }), {});
  const { data: readings } = await db.from("readings").select("id,kind,title,status,deliver_at,delivered_at,error,attempts,profiles(email,name)")
    .order("deliver_at", { ascending: false }).limit(150);
  // Journal pilot: who saves on more than one day (no journal text is read here)
  const { data: activity } = await db.from("journal_activity").select("user_id,day").limit(20000);
  const days = (activity ?? []).reduce<Record<string, number>>((a, r) => ({ ...a, [r.user_id]: (a[r.user_id] ?? 0) + 1 }), {});
  const journalers = Object.keys(days).length, returned = Object.values(days).filter(n => n > 1).length;
  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString("en-US", { timeZone: "America/Los_Angeles", dateStyle: "short", timeStyle: "short" }) : "");
  return (
    <section className="wrap" style={{ paddingBottom: 80 }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Admin</h1>
      <p>Members: {members?.length ?? 0} total. Free {counts.free ?? 0}, Timeline {counts.timeline ?? 0}, Deep Dive {counts.deep ?? 0}.</p>
      <p>Seeing Numbers: {journalers} {journalers === 1 ? "person has" : "people have"} saved an entry; {returned} came back on a later day to save another{journalers ? ` (${Math.round((returned / journalers) * 100)}%)` : ""}.</p>
      <AdminActions />
      <h2 style={{ fontSize: "var(--step-2)", marginTop: 32 }}>Readings</h2>
      <p className="hint">Times are Los Angeles time. Readings are written up to 12 hours before they're due, then sent at their moment.</p>
      <table className="admin">
        <thead><tr><th>Member</th><th>Kind</th><th>Title</th><th>Status</th><th>Due</th><th>Delivered</th><th></th></tr></thead>
        <tbody>
          {(readings ?? []).map((r: any) => (
            <tr key={r.id}>
              <td>{r.profiles?.name}<br /><span className="hint">{r.profiles?.email}</span></td>
              <td>{r.kind}</td>
              <td>{r.status === "ready" ? <Link href={`/reading/${r.id}`}>{r.title}</Link> : r.title}</td>
              <td>{r.status}{r.error && <><br /><span className="error">{r.error}</span></>}</td>
              <td>{fmt(r.deliver_at)}</td>
              <td>{fmt(r.delivered_at)}</td>
              <td><AdminActions id={r.id} failed={r.status === "failed"} pending={!r.delivered_at} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
