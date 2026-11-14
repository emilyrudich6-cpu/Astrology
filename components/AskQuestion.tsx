"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { key: string; label: string; emoji: string; questions: string[] };

export default function AskQuestion({ menu, remaining, perMonth, buyPrice }: { menu: Cat[]; remaining: number; perMonth: number; buyPrice?: string }) {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const current = menu.find(m => m.key === cat);

  const buying = remaining <= 0;
  if (buying && !buyPrice) return <p className="hint">You've used this month's {perMonth} insights. New ones open on the 1st.</p>;

  async function buy() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/buy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ product: "question", category: cat, question: q }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (j.url) { location.href = j.url; return; } // keep "Opening secure checkout…" until Stripe loads
    setBusy(false); setMsg(j.error ?? "Couldn't open checkout. Try again.");
  }

  async function ask() {
    setBusy(true); setMsg("");
    const r = await fetch("/api/questions", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: cat, question: q }) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) { setMsg(j.error ?? "Couldn't send your question. Try again."); return; }
    setCat(null); setQ(null); setMsg("Asked. Your answer arrives on a surprise day within the week.");
    router.refresh();
  }

  return (
    <div>
      <p className="hint">{buying
        ? (perMonth > 0 ? `You've used this month's ${perMonth} questions. Buy one more for ${buyPrice}: pick an area, then the question.` : `Ask one question for ${buyPrice} and get your answer in minutes. Pick an area, then the question.`)
        : `${remaining} of ${perMonth} personalized insights left this month. Pick an area, then what you want to know.`}</p>
      <div className="cats" role="group" aria-label="Question area">
        {menu.map(m => (
          <button key={m.key} className="chip" aria-pressed={cat === m.key} onClick={() => { setCat(m.key); setQ(null); setMsg(""); }}>
            {m.emoji}{"︎"} {m.label}
          </button>
        ))}
      </div>
      {current && (
        <div className="qlist" role="group" aria-label="Question">
          {current.questions.map(x => <button key={x} className="qopt" aria-pressed={q === x} onClick={() => setQ(x)}>{x}</button>)}
        </div>
      )}
      {q && !buying && <button className="btn" disabled={busy} onClick={ask}>{busy ? "Sending…" : "Get this insight"}</button>}
      {q && buying && <button className="btn" disabled={busy} onClick={buy}>{busy ? "Opening secure checkout…" : `Buy this answer, ${buyPrice}`}</button>}
      {msg && <p className="hint" role="status" style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
