// Seeing Numbers: normalizing sequences and their symbolic meanings. No dependencies (browser + server).

export const FREE_JOURNAL_CAP = 5;

/** "12:12", "12.12" and "1212" group together; "123" and "321" stay distinct. */
export function normalizeNumber(raw: string): string | null {
  const t = raw.trim();
  if (!/^[0-9][0-9:.\-\s]*$/.test(t) || t.length > 20) return null;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 1 && digits.length <= 12 ? digits : null;
}

export interface NumberMeaning { title: string; meaning: string; question: string }

const DIGIT: Record<string, { word: string; meaning: string; question: string }> = {
  "0": { word: "Zeros", meaning: "Traditionally a sign of beginnings and open potential: the circle before anything is written on it.", question: "What would you start if nothing from the past had to come with you?" },
  "1": { word: "Ones", meaning: "Traditionally linked to new starts and intention: your thoughts are setting something in motion.", question: "What were you focused on in that moment, and is it what you want to grow?" },
  "2": { word: "Twos", meaning: "Traditionally about partnership, balance and patience: something is coming together slowly.", question: "Which relationship or plan is asking for patience right now?" },
  "3": { word: "Threes", meaning: "Traditionally about expression, creativity and support around you.", question: "What have you been wanting to say or make, and who would cheer you on?" },
  "4": { word: "Fours", meaning: "Traditionally about foundations, stability and being on solid ground.", question: "What are you building right now, and what does it need from you this week?" },
  "5": { word: "Fives", meaning: "Traditionally a sign of change and movement: something is shifting.", question: "What change are you in the middle of, and what part of it feels exciting?" },
  "6": { word: "Sixes", meaning: "Traditionally about home, care and responsibility, and balancing what you give with what you need.", question: "Who are you taking care of, and is anyone taking care of you?" },
  "7": { word: "Sevens", meaning: "Traditionally about reflection, intuition and inner knowing.", question: "What does your gut already know about the thing you were thinking about?" },
  "8": { word: "Eights", meaning: "Traditionally about abundance, power and things coming full circle.", question: "Where are you ready to receive more, or to ask for what you're worth?" },
  "9": { word: "Nines", meaning: "Traditionally about endings and completion, clearing space for what comes next.", question: "What's finishing in your life, and what might it make room for?" },
};

const SPECIAL: Record<string, NumberMeaning> = {
  "1010": { title: "10:10", meaning: "Traditionally read as a nudge to keep going: a new chapter (1) with everything still possible (0).", question: "What's the next small step you've been putting off?" },
  "1212": { title: "12:12", meaning: "Traditionally about taking a step toward something you've been considering, with support for the move.", question: "What have you been thinking about doing, and what are you waiting for?" },
  "1221": { title: "12:21", meaning: "A mirror sequence, traditionally a sign to look at a situation from the other side.", question: "How would this look from the other person's point of view?" },
  "1122": { title: "11:22", meaning: "Traditionally an intuitive spark (11) meeting a practical plan (22): an idea ready to become real.", question: "What idea keeps coming back that you could make real?" },
  "1133": { title: "11:33", meaning: "Two master numbers together, traditionally linked to intuition (11) and compassion (33).", question: "What is your intuition telling you about someone you care about?" },
  "11": { title: "11", meaning: "A master number, traditionally linked to intuition and noticing signs.", question: "What did you just notice that you might usually overlook?" },
  "22": { title: "22", meaning: "A master number, traditionally linked to building something lasting.", question: "What would you build if you trusted it could last?" },
  "33": { title: "33", meaning: "A master number, traditionally linked to compassion and guidance.", question: "Who could use your support, or whose support could you accept?" },
};

const isRun = (s: string, step: 1 | -1) => s.split("").every((c, i) => i === 0 || Number(c) - Number(s[i - 1]) === step);

/** A short symbolic interpretation when one is curated, otherwise null. */
export function interpretNumber(norm: string): NumberMeaning | null {
  if (SPECIAL[norm]) return SPECIAL[norm];
  if (norm.length >= 2 && /^(\d)\1+$/.test(norm)) {
    const d = DIGIT[norm[0]];
    return { title: norm, meaning: `${d.word} repeating. ${d.meaning}`, question: d.question };
  }
  if (norm.length >= 3 && isRun(norm, 1))
    return { title: norm, meaning: "A climbing sequence, traditionally read as steps falling into place, one after another.", question: "What's the next step in front of you, just the next one?" };
  if (norm.length >= 3 && isRun(norm, -1))
    return { title: norm, meaning: "A countdown sequence, traditionally read as something winding down or about to begin.", question: "What are you counting down to, or ready to let go of?" };
  if (norm.length === 4 && norm[0] === norm[2] && norm[1] === norm[3])
    return { title: `${norm.slice(0, 2)}:${norm.slice(2)}`, meaning: "A repeating pair, traditionally a sign that a pattern or a choice is echoing in your life.", question: "What keeps repeating for you lately, and is it a pattern you want?" };
  if (norm.length >= 3 && norm === norm.split("").reverse().join(""))
    return { title: norm, meaning: "A mirror sequence, traditionally a sign to reflect before you act.", question: "What would you see if you looked at this situation in reverse?" };
  return null;
}

export const GENERAL_QUESTION = "What were you thinking about right when you noticed it, and why might it have caught your eye?";

export const numberWord = (n: number) => ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"][n] ?? String(n);

/** Shows a sighting at the local date and time it was logged, without shifting it to another zone */
export function whenLabel(e: { seen_local_date: string; seen_local_time: string | null }) {
  const d = new Date(`${e.seen_local_date}T${e.seen_local_time ?? "12:00"}:00Z`);
  const day = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return e.seen_local_time ? `${day} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}` : day;
}
