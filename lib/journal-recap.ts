// Phase 2 monthly recap: statements built only from the member's own entries.
import { themesIn, transitsOn, THEMES } from "./journal-compare";
import { natalChart, BirthData } from "./engine/natal";
import { numberWord } from "./seeing-numbers";

type E = { id: string; number_raw: string; number_norm: string; seen_at: string; seen_local_date: string; seen_local_time: string | null; note: string | null };

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const times = (n: number) => (n === 1 ? "once" : n === 2 ? "twice" : `${numberWord(n)} times`);
const entriesWord = (n: number, total: number) => (n === total ? (total === 2 ? "Both entries" : `All ${numberWord(total)} entries`) : `${cap(numberWord(n))} ${n === 1 ? "entry" : "entries"}`);

export function buildRecap(entries: E[], birth: BirthData | null) {
  // Recurring sequences (12:12 and 1212 count together)
  const groups = new Map<string, E[]>();
  for (const e of entries) groups.set(e.number_norm, [...(groups.get(e.number_norm) ?? []), e]);
  const recurring = [...groups.values()].filter(g => g.length > 1).sort((a, b) => b.length - a.length).map(g => {
    const shown = mostCommon(g.map(e => e.number_raw));
    const withTheme = THEMES.map(t => ({ t, n: g.filter(e => t.words.test(e.note ?? "")).length })).filter(x => x.n > 0).sort((a, b) => b.n - a.n)[0];
    return {
      number: shown, ids: g.map(e => e.id),
      sentence: `You logged ${shown} ${times(g.length)} this month.` + (withTheme ? ` ${entriesWord(withTheme.n, g.length)} mention${withTheme.n === 1 ? "s" : ""} ${withTheme.t.label}.` : ""),
    };
  });
  // Themes across all of the month's notes
  const themeCounts = THEMES.map(t => ({ label: t.label, ids: entries.filter(e => t.words.test(e.note ?? "")).map(e => e.id) })).filter(x => x.ids.length).sort((a, b) => b.ids.length - a.ids.length);
  // The main transit active on each entry's date
  let chart = null as ReturnType<typeof natalChart> | null;
  try { chart = birth ? natalChart(birth) : null; } catch { chart = null; }
  const rows = entries.map(e => {
    let transit: string | null = null;
    if (chart) { try { transit = transitsOn(chart, new Date(e.seen_at), themesIn(e.note))[0]?.label ?? null; } catch { transit = null; } }
    return { ...e, transit };
  });
  return { recurring, themes: themeCounts, rows };
}
function mostCommon(xs: string[]) {
  const c = xs.reduce<Record<string, number>>((m, x) => ((m[x] = (m[x] ?? 0) + 1), m), {});
  return Object.entries(c).sort((a, b) => b[1] - a[1])[0][0];
}
