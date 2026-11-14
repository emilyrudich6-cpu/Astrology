"use client";
// "Your Numerology": Life Path, Birthday and Personal Year from the birth date, plus optional
// Soul Urge and Expression from a full birth name. Everything is calculated in the browser;
// the name is never sent anywhere and is only remembered on this device if the visitor opts in.
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  lifePath, birthdayNumber, personalYear, nameNumbers, LIFE_PATH, BIRTHDAY, PERSONAL_YEAR, SOUL_URGE, EXPRESSION, YEAR_PROMPT, reduce,
} from "@/lib/numerology";

const NAME_KEY = "vp-birth-name";

function Card({ label, value, line }: { label: string; value: string; line: string }) {
  return (
    <div className="num-card">
      <span className="num-label">{label}</span>
      <span className="num-value">{value}</span>
      <span className="num-line">{line}</span>
    </div>
  );
}

export default function Numerology({ birthDate, serverYear, compact = false }: { birthDate: string; serverYear: number; compact?: boolean }) {
  // The year comes from the visitor's own clock once the page loads, so it rolls over at their midnight on January 1
  const [year, setYear] = useState(serverYear);
  useEffect(() => { setYear(new Date().getFullYear()); }, []);

  const lp = lifePath(birthDate), bd = birthdayNumber(birthDate), py = personalYear(birthDate, year), next = personalYear(birthDate, year + 1);
  const born = new Date(birthDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [remember, setRemember] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof nameNumbers>>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    try { const saved = localStorage.getItem(NAME_KEY); if (saved) { setName(saved); setRemember(true); setOpen(true); setResult(nameNumbers(saved)); } } catch {}
  }, []);

  function calculate(e: React.FormEvent) {
    e.preventDefault(); setErr("");
    const r = nameNumbers(name);
    if (!r) { setResult(null); setErr("Enter your full birth name using letters."); return; }
    setResult(r);
    try { if (remember) localStorage.setItem(NAME_KEY, name.trim()); else localStorage.removeItem(NAME_KEY); } catch {}
  }
  function forget() {
    try { localStorage.removeItem(NAME_KEY); } catch {}
    setRemember(false); setName(""); setResult(null);
  }

  return (
    <section className={`numerology ${compact ? "compact" : "result-block"}`} aria-labelledby="num-h">
      {compact ? <h3 id="num-h">Your Numerology</h3> : <h2 id="num-h" className="sec">Your Numerology</h2>}
      <div className="num-grid">
        <Card label="Life Path" value={lp.display} line={LIFE_PATH[lp.value]} />
        <Card label="Birthday" value={bd.display} line={BIRTHDAY[bd.value] ?? BIRTHDAY[reduce(bd.value, false)]} />
        <Card label={`Personal Year ${year}`} value={py.display} line={PERSONAL_YEAR[py.value]} />
      </div>

      <details className="num-how">
        <summary>How these were found</summary>
        <p><strong>Life Path {lp.display}.</strong> {born}: each part of the date is reduced first, then added: {lp.working}.
          {lp.total !== lp.value && !( [11, 22, 33].includes(lp.total)) && <> The {lp.total} is the number underneath your {lp.value}; it shows how you get there.</>}</p>
        <p><strong>Birthday {bd.display}.</strong> {bd.working}.</p>
        <p><strong>Personal Year {py.display}.</strong> Your birth month and day plus {year}: {py.working}. It changes every January 1; in {year + 1} you move into a {next.value} year.</p>
      </details>

      <p className="num-prompt"><em>{YEAR_PROMPT[py.value]}</em></p>
      <p className="num-seeing">Keep seeing the same number? Save what you saw and what was on your mind.{" "}
        <Link className="link-arrow" href="/seeing-numbers">Open Seeing Numbers →</Link></p>

      <div className="num-name">
        {!open ? (
          <button type="button" className="btn ghost small" onClick={() => setOpen(true)}>Add your full birth name</button>
        ) : (
          <form onSubmit={calculate}>
            <div className="field">
              <label htmlFor="birth-name">Your full birth name</label>
              <input id="birth-name" autoComplete="off" spellCheck={false} placeholder="First, middle and last, as on your birth certificate"
                value={name} onChange={e => setName(e.target.value)} />
              <p className="hint">Optional. Calculated on this device; we don't send or store it.</p>
            </div>
            <label className="num-check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember my name on this device</label>
            {err && <p className="error">{err}</p>}
            <div className="num-actions">
              <button className="btn small">Show my name numbers</button>
              {remember && result && <button type="button" className="linklike" onClick={forget}>Forget my name</button>}
            </div>
          </form>
        )}
        {result && (
          <>
            <div className="num-grid two">
              <Card label="Soul Urge" value={result.soulUrge.display} line={SOUL_URGE[result.soulUrge.value]} />
              <Card label="Expression" value={result.expression.display} line={EXPRESSION[result.expression.value]} />
            </div>
            {result.unmapped.length > 0 && <p className="hint">We could only count the letters A to Z, so {result.unmapped.join(" ")} {result.unmapped.length > 1 ? "were" : "was"} left out.</p>}
            <details className="num-how">
              <summary>How we count names</summary>
              <p><strong>Soul Urge</strong> adds the vowels; <strong>Expression</strong> adds every letter (A, J, S = 1; B, K, T = 2; and so on to I, R = 9). Each name is added up on its own, then the names are added together.</p>
              <p>Soul Urge: {result.soulUrge.working}. Expression: {result.expression.working}.</p>
              <p>Accents count as the plain letter (é as e), and spaces, hyphens and apostrophes are skipped. Y counts as a vowel when it sounds like one, as in Emily or Lynn, and as a consonant at the start of a name or next to another vowel, as in Yolanda or Maya. 11, 22 and 33 are master numbers, shown with their root, like 11/2.</p>
            </details>
          </>
        )}
      </div>
    </section>
  );
}
