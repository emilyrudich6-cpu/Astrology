"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const paras = (t: string) => t.split(/\n{2,}/).map((p, i) => {
  const clean = p.replace(/\*\*/g, "").trim();
  const m = clean.match(/^In plain English:\s*(.*)$/s);
  return m ? <p key={i} className="takeaway"><span>In plain English</span>{m[1]}</p> : <p key={i}>{clean}</p>;
});

/** The dominant-planet interpretation, loaded after the page so the chart appears instantly. */
export function DominantText({ b, fallback }: { b: string; fallback: string }) {
  const [text, setText] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => {
    let live = true;
    fetch("/api/free/dominant", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ b }) })
      .then(r => r.json()).then(j => { if (!live) return; if (j.text) setText(j.text); else setNote(j.error ?? ""); })
      .catch(() => live && setNote(""));
    return () => { live = false; };
  }, [b]);
  if (text) return <div className="prose">{paras(text)}</div>;
  return (
    <div className="prose" aria-busy={!note}>
      {paras(fallback)}
      {!note && <p className="hint loading">Writing your interpretation…</p>}
    </div>
  );
}

type Sample = { date: string; transit: string; area: string } | null;
const TOPICS = [{ key: "love", label: "Love ♡" }, { key: "work", label: "Work" }, { key: "growth", label: "Personal Growth" }] as const;
const niceDate = (d: string) => new Date(d.slice(0, 10) + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

/** Pick one: Love, Work or Personal Growth. */
export function TopicInsight({ b }: { b: string }) {
  const [topic, setTopic] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [err, setErr] = useState("");
  const [sample, setSample] = useState<Sample>(null);
  const [busy, setBusy] = useState(false);
  async function pick(t: string) {
    if (topic) return;
    setTopic(t); setBusy(true);
    const r = await fetch("/api/free/insight", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ b, topic: t }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setSample(j.sample ?? null);
    if (j.text) setText(j.text); else setErr(j.error ?? "The insight didn't load. Try again in a minute.");
  }
  return (
    <div>
      <div className="topics" role="group" aria-label="Choose one insight">
        {TOPICS.map(t => (
          <button key={t.key} type="button" className="chip" aria-pressed={topic === t.key} disabled={!!topic && topic !== t.key} onClick={() => pick(t.key)}>{t.label}</button>
        ))}
      </div>
      {!topic && <p className="hint">Choose one. Your full timeline covers all three.</p>}
      {busy && <p className="hint loading">Reading your chart…</p>}
      {text && <div className="prose">{paras(text)}</div>}
      {err && <p className="hint">{err}</p>}
      {topic === "love" && !busy && (
        <div className="follow">
          <p className="kicker-italic small rose">Is there someone you had in mind? ♡</p>
          <Link className="btn small" href="/#plans">Compare our charts</Link>
        </div>
      )}
      {topic && topic !== "love" && !busy && sample && (
        <div className="follow">
          <p className="hint" style={{ marginBottom: 4 }}>A date from your timeline</p>
          <div className="date-pill"><b>{niceDate(sample.date)}</b><span>{sample.transit}</span></div>
          <p className="hint">Your full timeline shows every date like this, each month. <Link href="/#plans">See plans</Link></p>
        </div>
      )}
    </div>
  );
}

/** Download PDF, Share my Big Three, Email me my chart. */
export function ChartActions({ b, shareUrl }: { b: string; shareUrl: string }) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  async function share() {
    const url = location.origin + shareUrl;
    if (navigator.share) { try { await navigator.share({ title: "My Big Three", url }); return; } catch { return; } }
    await navigator.clipboard?.writeText(url).catch(() => {});
    setMsg("Link copied. It shows your three signs only, never your birth details.");
  }
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = await fetch("/api/free/email", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, b }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    setMsg(r?.ok ? "Sent. Check your inbox." : j.error ?? "That didn't send. Try again.");
  }
  return (
    <div className="no-print">
      <div className="actions">
        <button type="button" className="btn small" onClick={() => window.print()}>Download PDF</button>
        <button type="button" className="btn ghost small" onClick={share}>Share my Big Three</button>
        <button type="button" className="btn ghost small" onClick={() => setEmailOpen(o => !o)} aria-expanded={emailOpen}>Email me my chart</button>
      </div>
      {emailOpen && (
        <form className="email-row" onSubmit={send}>
          <label htmlFor="ce" className="sr-only">Email address</label>
          <input id="ce" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button className="btn small" disabled={busy}>{busy ? "Sending…" : "Send"}</button>
        </form>
      )}
      {msg && <p className="hint" role="status" style={{ marginTop: 10 }}>{msg}</p>}
    </div>
  );
}
