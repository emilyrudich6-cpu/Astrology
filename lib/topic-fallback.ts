// Short, chart-specific insights built from the calculated chart, used when the written (Claude) version isn't available.
import type { NatalChart } from "./engine/natal";
import { HOUSE_THEMES } from "./engine/transits";
import { signOf } from "./engine/core";

const STYLE: Record<string, string> = {
  Aries: "bold, quick and direct", Taurus: "steady, grounded and loyal", Gemini: "curious, playful and talkative",
  Cancer: "tender, protective and deeply caring", Leo: "warm, generous and wholehearted", Virgo: "thoughtful, devoted and attentive to detail",
  Libra: "graceful, fair and partnership-minded", Scorpio: "intense, private and all-in", Sagittarius: "free-spirited, honest and adventurous",
  Capricorn: "patient, serious and built to last", Aquarius: "independent, original and friendship-first", Pisces: "dreamy, romantic and intuitive",
};
const ord = (n: number) => n + (n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th");
const inHouse = (h: number | null | undefined) => (h ? ` in your ${ord(h)} house (${HOUSE_THEMES[h]})` : "");

export function topicFallback(c: NatalChart, topic: "love" | "work" | "growth", uncertain: string[]): string {
  const P = Object.fromEntries(c.planets.map(p => [p.name, p]));
  const sign = (n: string) => (uncertain.includes(n) ? null : P[n].sign);
  const cusp = (h: number) => (c.houseCusps ? signOf(c.houseCusps[h - 1].lon) : null);
  if (topic === "love") {
    const v = P.Venus, m = P.Mars, d = cusp(7), moon = sign("Moon");
    return [
      `Your Venus is in ${v.sign}${inHouse(v.house)}, so the way you love is ${STYLE[v.sign]}. It's what you're drawn to and how you show affection.`,
      `Your Mars in ${m.sign} shows how you go after what you want: ${STYLE[m.sign]}.` +
        (d ? ` Your 7th house of partnership starts in ${d}, which hints at the kind of person who balances you: someone ${STYLE[d]}.` : "") +
        (moon ? ` And with your Moon in ${moon}, you feel safest with someone who meets you in a way that's ${STYLE[moon]}.` : ""),
    ].join("\n\n");
  }
  if (topic === "work") {
    const mc = c.angles ? signOf(c.angles[1].lon) : null, s = P.Saturn, sun = P.Sun;
    return [
      mc ? `Your Midheaven, the top of your chart and the point of career and reputation, is in ${mc}. People see you at your best at work when you're ${STYLE[mc]}.`
        : `Your Sun in ${sun.sign} is the clearest guide to the work that lights you up: anything that lets you be ${STYLE[sun.sign]}.`,
      `Saturn in ${s.sign}${inHouse(s.house)} is where you build mastery slowly. It's demanding, but what you build there lasts.` +
        (sun.house ? ` Your Sun${inHouse(sun.house)} shows where you shine most naturally.` : ""),
    ].join("\n\n");
  }
  const node = c.points.find(p => p.name.startsWith("North Node (true)"));
  const nodeSign = node ? signOf(node.lon) : null, j = P.Jupiter;
  return [
    nodeSign ? `Your North Node is in ${nodeSign}${inHouse(node?.house)}. It points to the direction your life keeps nudging you toward: becoming more ${STYLE[nodeSign]}, even when it feels unfamiliar.` : "",
    `Jupiter in ${j.sign}${inHouse(j.house)} is where growth comes easiest. Say yes to opportunities that let you be ${STYLE[j.sign]}.`,
  ].filter(Boolean).join("\n\n");
}
