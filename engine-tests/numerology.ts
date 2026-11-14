import { lifePath, birthdayNumber, personalYear, nameNumbers, cleanName } from "../lib/numerology";
let fails = 0;
const eq = (label: string, got: any, want: any) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fails++; console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${JSON.stringify(got)}${ok ? "" : ` (want ${JSON.stringify(want)})`}`); };
// Emily's report
eq("Life Path Oct 6 1995", lifePath("1995-10-06").display, "13/4");
eq("Life Path working", lifePath("1995-10-06").working, "1 + 6 + 6 = 13, then 1 + 3 = 4");
eq("Birthday 6", birthdayNumber("1995-10-06").display, "6");
eq("Personal Year 2026", personalYear("1995-10-06", 2026).value, 8);
eq("Personal Year 2027 (rollover)", personalYear("1995-10-06", 2027).value, 9);
eq("Personal Year 2028", personalYear("1995-10-06", 2028).value, 1);
const n = nameNumbers("Emily Leigh Rudich")!;
eq("Soul Urge Emily Leigh Rudich", n.soulUrge.display, "11/2");
eq("Expression Emily Leigh Rudich", n.expression.display, "6");
// Master numbers and edge cases
eq("Life Path master stays single (Nov 29 1990: 11+11+1=23 -> 5)", lifePath("1990-11-29").display, "23/5");
eq("Life Path total 11 shown single (Feb 2 2005: 2+2+7=11)", lifePath("2005-02-02").display, "11");
eq("Life Path single digit total (Jan 1 2000: 1+1+2=4)", lifePath("2000-01-01").display, "4");
eq("Birthday 29 -> 29/11", birthdayNumber("1990-03-29").display, "29/11");
eq("Birthday 22 master", birthdayNumber("1990-03-22").display, "22");
eq("Birthday 13 -> 13/4", birthdayNumber("1990-03-13").display, "13/4");
eq("Accents removed", cleanName("José Ñúñez").words, ["JOSE", "NUNEZ"]);
eq("Hyphen and apostrophe", cleanName("Mary-Kate O'Neil").words, ["MARY", "KATE", "ONEIL"]);
eq("Non-Latin reported", cleanName("Анна").unmapped.length > 0, true);
eq("Y vowel in Lynn", nameNumbers("Lynn")!.soulUrge.value, 7);
eq("Y consonant in Yolanda (O A A = 6+1+1=8)", nameNumbers("Yolanda")!.soulUrge.value, 8);
eq("Y consonant in Maya (A A = 2)", nameNumbers("Maya")!.soulUrge.value, 2);
process.exit(fails ? 1 : 0);
