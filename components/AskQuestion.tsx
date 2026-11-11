"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Cat = { key: string; label: string; emoji: string; questions: string[] };

export default function AskQuestion({ menu, remaining, perMonth }: { menu: Cat[]; remaining: number; perMonth: number }) {
  const [cat, setCat] = useState<string | null>(null);
  const [q, setQ] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const current = menu.find(m => m.key === cat);

  if (remaining <= 0) return <p className="hint">You've asked all {perMonth} of this month's questions. New ones open on the 1st.</p>;

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
      <p className="hint">{remaining} of {perMonth} left this month. Pick an area, then the question.</p>
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
      {q && <button className="btn" disabled={busy} onClick={ask}>{busy ? "Sending…" : "Ask this question"}</button>}
      {msg && <p className="hint" role="status" style={{ marginTop: 12 }}>{msg}</p>}
    </div>
  );
}
