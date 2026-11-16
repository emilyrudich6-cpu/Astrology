// The Natal Chart Deep Dive (a Markdown reading): title, the chart and its summary tables first and always
// visible, then every section of the reading collapsed under its own heading. The text itself is never changed,
// so Deep Dives saved before this layout existed read exactly the same once a section is opened.
import { marked } from "marked";
import { md } from "@/lib/markdown";
import ChartWheel from "@/components/ChartWheel";
import type { NatalChart } from "@/lib/engine/natal";

const inline = (s: string) => marked.parseInline(s.replace(/[<>]/g, c => (c === "<" ? "&lt;" : "&gt;")), { async: false }) as string;
const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
const isRule = (line?: string) => !!line && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export interface MdTable { caption: string | null; head: string[]; rows: string[][] }

/** Splits a Markdown reading into its title, opening text, tables and "## " sections */
export function splitReading(body: string) {
  const lines = body.split("\n");
  let title = "";
  const intro: string[] = [];
  const sections: { heading: string; lines: string[] }[] = [];
  const tables: MdTable[] = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!title && /^# /.test(l)) { title = l.slice(2).trim(); continue; }
    if (/^## /.test(l)) { sections.push({ heading: l.slice(3).trim(), lines: [] }); continue; }
    if (/^\s*\|/.test(l) && isRule(lines[i + 1])) {
      const t: MdTable = { caption: sections.at(-1)?.heading ?? null, head: cells(l), rows: [] };
      i += 2;
      while (i < lines.length && /^\s*\|/.test(lines[i])) t.rows.push(cells(lines[i++]));
      i--;
      tables.push(t);
      continue;
    }
    (sections.length ? sections.at(-1)!.lines : intro).push(l);
  }
  // A closing line after the last section (the disclaimer) stays visible below the sections
  let outro = "";
  const last = sections.at(-1);
  if (last) {
    const idx = last.lines.findLastIndex(x => x.trim() !== "");
    if (idx >= 0 && /^[*_].*[*_]$/.test(last.lines[idx].trim())) outro = last.lines.splice(idx).join("\n");
  }
  const clean = (ls: string[]) => ls.join("\n").replace(/\n\s*---\s*(\n|$)/g, "\n").trim();
  return { title, intro: clean(intro), tables, sections: sections.map(s => ({ heading: s.heading, text: clean(s.lines) })).filter(s => s.text), outro };
}

/** A summary table. On a phone each row becomes a stacked card with its column names, so nothing scrolls sideways. */
export function StackTable({ caption, head, rows, narrow }: { caption?: string | null; head: string[]; rows: string[][]; narrow?: boolean }) {
  return (
    <table className={narrow ? "doc-table dd-narrow" : "doc-table stack-table"}>
      {caption && <caption>{caption}</caption>}
      <thead><tr>{head.map((h, i) => <th key={i} scope="col" dangerouslySetInnerHTML={{ __html: inline(h) }} />)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={i}>{head.map((h, j) => j === 0
          ? <th key={j} scope="row" dangerouslySetInnerHTML={{ __html: inline(r[j] ?? "") }} />
          : <td key={j} data-label={h.replace(/[*_`]/g, "")} dangerouslySetInnerHTML={{ __html: inline(r[j] ?? "") }} />)}</tr>
      ))}</tbody>
    </table>
  );
}

export default function DeepDiveView({ body, chart, children }: { body: string; chart: NatalChart | null; children?: React.ReactNode }) {
  const r = splitReading(body);
  return (
    <article className="deepdive">
      {r.title && <h1>{r.title}</h1>}
      <div className="dd-top">
        {chart && (
          <div className="dd-wheel">
            <ChartWheel label={r.title || "Birth chart"} planets={chart.planets} cusps={chart.houseCusps?.map(h => h.lon)} asc={chart.angles?.[0].lon ?? null} aspects={chart.aspects} />
          </div>
        )}
        {r.tables.map((t, i) => <StackTable key={i} {...t} />)}
        {chart && (
          <StackTable narrow caption="Your placements" head={chart.houseCusps ? ["Planet", "Sign and degree", "House"] : ["Planet", "Sign and degree"]}
            rows={chart.planets.map(p => [p.name + (p.retrograde ? " (retrograde)" : ""), p.position, ...(chart.houseCusps ? [p.house ? String(p.house) : ""] : [])])} />
        )}
      </div>
      {r.intro && <div className="dd-intro" dangerouslySetInnerHTML={{ __html: md(r.intro) }} />}
      {r.sections.length > 0 && <p className="hint no-print">Tap a heading to read that part.</p>}
      {r.sections.map((s, i) => (
        <details key={i} className="fold">
          <summary><h2>{s.heading}</h2></summary>
          <div dangerouslySetInnerHTML={{ __html: md(s.text) }} />
        </details>
      ))}
      {r.outro && <div dangerouslySetInnerHTML={{ __html: md(r.outro) }} />}
      {children}
    </article>
  );
}
