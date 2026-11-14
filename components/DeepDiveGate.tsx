import Link from "next/link";
export default function DeepDiveGate({ next }: { next: string }) {
  return (
    <div className="panel" style={{ marginTop: 22 }}>
      <h2 style={{ fontSize: "var(--step-2)", marginTop: 0 }}>Compare with my timeline</h2>
      <p>Deep Dive members can see which of their own transits were active the day they saw a number, plus a monthly recap and unlimited journal entries. Your entries stay yours either way.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link className="btn" href="/dashboard?plan=deep">See Deep Dive</Link>
        <Link className="btn ghost" href={next}>Back to my journal</Link>
      </div>
    </div>
  );
}
