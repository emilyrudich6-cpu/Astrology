// Numerology for Vertex Point. Pure functions, no dependencies: runs in the browser and on the server.
//
// CONVENTIONS
// Life Path: reduce the month, day and year separately (keeping 11, 22 and 33), add them, then reduce
//   the total (keeping 11, 22 and 33). The total before its final reduction is kept for display:
//   October 6, 1995 -> 1 + 6 + 6 = 13 -> 1 + 3 = 4, shown as "13/4". A total that is already final
//   (1-9, or a master number) is shown as a single value.
// Birthday: the day of the month. 1-9, 11 and 22 stand alone; other days show "day/reduced"
//   (13 -> "13/4", 29 -> "29/11").
// Personal Year: birth month + birth day + the calendar year, digits added and reduced to 1-9
//   (no master numbers). October 6 gives 8 for 2026 and 9 for 2027. It changes on January 1.
// Name numbers (Pythagorean): A J S = 1, B K T = 2, C L U = 3, D M V = 4, E N W = 5, F O X = 6,
//   G P Y = 7, H Q Z = 8, I R = 9.
//   - Accents are removed (é -> e, ñ -> n); ß -> ss, æ -> ae, œ -> oe, ø -> o, ł -> l, đ -> d.
//   - Spaces, hyphens, apostrophes, periods, digits and other punctuation are ignored.
//     A hyphenated name ("Mary-Kate") is treated as separate names.
//   - Letters outside A-Z after that (for example Cyrillic or Chinese characters) can't be mapped;
//     the calculation reports them instead of guessing.
//   - Vowels are A E I O U. Y counts as a vowel when it isn't next to another vowel in the same name
//     and isn't the first letter of a name (Emily, Lynn, Rudy: vowel; Yolanda, Kaye, Maya: consonant).
//   - Each name is added up and reduced on its own (keeping 11, 22, 33), then the names are added and
//     reduced again (keeping 11, 22, 33). Soul Urge uses the vowels; Expression uses every letter.
//   - A master-number result is displayed with its root, like "11/2".

export const MASTER = new Set([11, 22, 33]);
const digitSum = (n: number) => String(n).split("").reduce((s, d) => s + Number(d), 0);

/** Reduce to one digit, keeping master numbers unless keepMasters is false */
export function reduce(n: number, keepMasters = true): number {
  while (n > 9 && !(keepMasters && MASTER.has(n))) n = digitSum(n);
  return n;
}

export interface NumberResult { value: number; total: number; display: string; working: string }

function parseDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) throw new Error("Birth date should look like YYYY-MM-DD");
  return { y, m, d };
}

export function lifePath(isoDate: string): NumberResult {
  const { y, m, d } = parseDate(isoDate);
  const parts = [reduce(m), reduce(d), reduce(digitSum(y))];
  const total = parts.reduce((a, b) => a + b, 0);
  const value = reduce(total);
  const final = total === value;
  const steps = [`${parts.join(" + ")} = ${total}`];
  let t = total;
  while (t !== value) { const next = digitSum(t); steps.push(`${String(t).split("").join(" + ")} = ${next}`); t = next; if (MASTER.has(t)) break; }
  return { value, total, display: final ? String(value) : `${total}/${value}`, working: steps.join(", then ") };
}

export function birthdayNumber(isoDate: string): NumberResult {
  const { d } = parseDate(isoDate);
  const value = reduce(d);
  const final = d === value;
  return { value, total: d, display: final ? String(d) : `${d}/${value}`, working: final ? `Born on the ${d}${suffix(d)}` : `${String(d).split("").join(" + ")} = ${value}` };
}

export function personalYear(isoDate: string, year: number): NumberResult {
  const { m, d } = parseDate(isoDate);
  const total = digitSum(m) + digitSum(d) + digitSum(year);
  const value = reduce(total, false);
  const digits = `${m}${d}${year}`.split("").join(" + ");
  return { value, total, display: String(value), working: `${digits} = ${total}${total !== value ? `, then ${String(total).split("").join(" + ")} = ${value}` : ""}` };
}

const suffix = (n: number) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th");

// ---------- Names ----------
const LETTER: Record<string, number> = {};
"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").forEach((c, i) => (LETTER[c] = (i % 9) + 1));

export function cleanName(raw: string): { words: string[]; unmapped: string[] } {
  const swapped = raw.replace(/ß/g, "ss").replace(/[æÆ]/g, "ae").replace(/[œŒ]/g, "oe").replace(/[øØ]/g, "o")
    .replace(/[łŁ]/g, "l").replace(/[đĐ]/g, "d");
  const plain = swapped.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  const words = plain.split(/[\s\-‐–—]+/).map(w => w.replace(/[^\p{L}]/gu, "")).filter(Boolean);
  const unmapped = [...new Set(words.join("").split("").filter(c => !(c in LETTER)))];
  return { words: words.map(w => w.split("").filter(c => c in LETTER).join("")).filter(Boolean), unmapped };
}

const VOWELS = new Set(["A", "E", "I", "O", "U"]);
export function isVowelAt(word: string, i: number): boolean {
  const c = word[i];
  if (VOWELS.has(c)) return true;
  if (c !== "Y" || i === 0) return false;
  return !VOWELS.has(word[i - 1] ?? "") && !VOWELS.has(word[i + 1] ?? "");
}

export interface NameNumbers { soulUrge: NumberResult; expression: NumberResult; unmapped: string[]; words: string[] }

export function nameNumbers(fullName: string): NameNumbers | null {
  const { words, unmapped } = cleanName(fullName);
  if (!words.length) return null;
  const calc = (pick: (w: string, i: number) => boolean): NumberResult => {
    const perWord = words.map(w => reduce(w.split("").reduce((s, c, i) => s + (pick(w, i) ? LETTER[c] : 0), 0)));
    const total = perWord.reduce((a, b) => a + b, 0);
    const value = reduce(total);
    const display = MASTER.has(value) ? `${value}/${reduce(value, false)}` : String(value);
    return { value, total, display, working: `${words.map((w, k) => `${cap(w)} ${perWord[k]}`).join(" + ")} = ${total}${total !== value ? ` → ${value}` : ""}` };
  };
  return { soulUrge: calc(isVowelAt), expression: calc(() => true), unmapped, words };
}
const cap = (w: string) => w[0] + w.slice(1).toLowerCase();

// ---------- Meanings (one line each) ----------
export const LIFE_PATH: Record<number, string> = {
  1: "The Leader: here to start things and trust your own way",
  2: "The Peacemaker: you read the room and bring people together",
  3: "The Creator: expression, charm and making things fun",
  4: "The Builder: turning hard work into something real",
  5: "The Free Spirit: change, travel and learning by living",
  6: "The Nurturer: home, beauty and taking care of your people",
  7: "The Seeker: depth, intuition and the questions under the questions",
  8: "The Powerhouse: ambition, money and owning your worth",
  9: "The Old Soul: compassion, art and seeing the bigger picture",
  11: "The Intuitive: a master number for insight and inspiring others",
  22: "The Master Builder: a master number for big visions made real",
  33: "The Master Teacher: a master number for healing through love",
};
export const BIRTHDAY: Record<number, string> = {
  1: "A natural self-starter who leads by example",
  2: "Gentle, tactful and quietly perceptive",
  3: "Witty and expressive; you light up a room",
  4: "Dependable and organized; people count on you",
  5: "Restless in the best way; you need variety",
  6: "Takes on responsibility for others",
  7: "Thoughtful and private; you need time alone to think",
  8: "Ambitious and capable with money and power",
  9: "Big-hearted and generous; you give a lot",
  11: "Sensitive and intuitive, with a strong inner voice",
  22: "Practical vision: you can build what others only imagine",
};
export const PERSONAL_YEAR: Record<number, string> = {
  1: "New beginnings: plant seeds and start fresh",
  2: "Patience and partnership: let things grow",
  3: "Joy and self-expression: create and connect",
  4: "Foundations: steady work that lasts",
  5: "Change and freedom: expect the unexpected",
  6: "Home, love and responsibility",
  7: "Reflection and inner work: slow down and listen",
  8: "Money, power and recognition",
  9: "Completion: release what's done and clear the way",
};
export const SOUL_URGE: Record<number, string> = {
  1: "You want to be your own person and lead",
  2: "You want closeness, harmony and a true partner",
  3: "You want to express yourself and be enjoyed",
  4: "You want security and something solid to stand on",
  5: "You want freedom and new experiences",
  6: "You want to love and be needed",
  7: "You want truth, depth and quiet understanding",
  8: "You want success and to be taken seriously",
  9: "You want to make the world a little kinder",
  11: "Intuitive, wants depth and true connection",
  22: "You want to build something that outlasts you",
  33: "You want to heal and uplift the people you love",
};
export const EXPRESSION: Record<number, string> = {
  1: "Independent and original; you go first",
  2: "Diplomatic; a natural collaborator",
  3: "Creative communicator with a gift for words",
  4: "Practical builder; reliable and thorough",
  5: "Adaptable and magnetic; you thrive on change",
  6: "Creative caretaker; makes things beautiful",
  7: "Analytical and intuitive; a deep thinker",
  8: "Natural executive; you make things happen",
  9: "Humanitarian and artist; generous with your gifts",
  11: "Inspired messenger; you light the way for others",
  22: "Visionary builder of big, practical things",
  33: "Compassionate teacher and healer",
};
/** A short reflection prompt for the current Personal Year */
export const YEAR_PROMPT: Record<number, string> = {
  1: "What's one thing you'd start this year if you trusted yourself completely?",
  2: "Who's one person you'd like to grow closer to this year, and what's a first step?",
  3: "What would you make or share this year if nobody were grading it?",
  4: "What's one small habit that would make next year easier?",
  5: "What change have you been resisting that might actually set you free?",
  6: "Who are you taking care of, and who's taking care of you?",
  7: "What question keeps coming back to you lately?",
  8: "What would you ask for this year if you fully believed you were worth it?",
  9: "What are you ready to let go of before your next chapter begins?",
};

/** A reflection question for each Life Path */
export const LIFE_PATH_QUESTION: Record<number, string> = {
  1: "Where in your life are you waiting for permission you could give yourself?",
  2: "Whose needs have you been putting ahead of your own, and what do you need right now?",
  3: "What would you say or make if you didn't worry about how it lands?",
  4: "What are you building slowly that you're proud of, even if no one sees it yet?",
  5: "What part of your life is asking for more freedom or change?",
  6: "Who do you take care of, and how do you let yourself be cared for?",
  7: "What question have you been carrying that deserves some quiet time?",
  8: "Where are you ready to ask for what you're worth?",
  9: "What are you ready to let go of so something new can begin?",
  11: "What has your intuition been telling you that you haven't acted on yet?",
  22: "What big vision would you start on if you trusted yourself to finish it?",
  33: "How do you care for others, and what would it look like to care for yourself the same way?",
};
