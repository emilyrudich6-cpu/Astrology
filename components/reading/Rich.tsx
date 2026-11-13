// Plain text from the writer -> paragraphs, with **bold** for key phrases. React escapes everything else.
import { Fragment } from "react";

export function Inline({ text }: { text: string }) {
  const parts = (text ?? "").split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>)}</>;
}

export function Rich({ text, className }: { text?: string | string[]; className?: string }) {
  const paras = (Array.isArray(text) ? text : (text ?? "").split(/\n\s*\n/)).map(s => s.trim()).filter(Boolean);
  if (!paras.length) return null;
  return <>{paras.map((p, i) => <p key={i} className={className}><Inline text={p} /></p>)}</>;
}

export const byId = <T extends { id: string }>(xs: T[] | undefined, id: string, i: number): T | undefined =>
  xs?.find(x => x.id === id) ?? xs?.[i];
