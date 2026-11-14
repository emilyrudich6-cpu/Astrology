// Run twice: with FEATURE_JOURNAL_COMPARE=on and without
const on = process.env.FEATURE_JOURNAL_COMPARE === "on";
import("../lib/features").then(({ journalCap, hasDeepDive }) => {
  let f = 0; const eq = (l: string, g: any, w: any) => { const ok = g === w; if (!ok) f++; console.log(`${ok ? "ok  " : "FAIL"} [phase 2 ${on ? "on " : "off"}] ${l}: ${g}`); };
  eq("active Deep Dive cap", journalCap("deep"), on ? null : 5);
  eq("expired Deep Dive (tier back to free) cap", journalCap("free"), 5);
  eq("Timeline member cap", journalCap("timeline"), 5);
  eq("Deep Dive gets the comparison", hasDeepDive("deep"), true);
  eq("expired member doesn't", hasDeepDive("free"), false);
  process.exit(f ? 1 : 0);
});
