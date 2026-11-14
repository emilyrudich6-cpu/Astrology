// Dashboard home for the Seeing Numbers journal: a "Log a number" button and the member's most-logged number.
import Link from "next/link";

export default function SeeingNumbersCard({ top }: { top: { number: string; count: number; total: number } | null }) {
  return (
    <div className="panel sn-card">
      <div className="sn-card-head">
        <h3>Seeing Numbers</h3>
        <span className="sn-card-private">Free · Private</span>
      </div>
      <div className="sn-card-body">
        <p className="sn-card-num">{top ? top.number : "11:11"}</p>
        {top ? (
          <p className="sn-card-line">Your most-logged number, <strong>{top.count === 1 ? "logged once" : `logged ${top.count} times`}</strong>{top.total > top.count ? ` out of ${top.total} entries` : ""}.</p>
        ) : (
          <p className="sn-card-line"><span className="sn-card-example">Example</span> Keep seeing the same number? Note it, and what was on your mind.</p>
        )}
      </div>
      <div className="sn-card-actions">
        <Link className="btn primary" href="/seeing-numbers#log">Log a number</Link>
        {top && <Link className="sn-card-link" href="/seeing-numbers">See my journal</Link>}
      </div>
    </div>
  );
}
