import { marked, Renderer } from "marked";
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const renderer = new Renderer();
renderer.html = ({ text }) => escape(text); // never pass raw HTML through
const HL = /\b(Aries|Taurus|Gemini|Cancer|Leo|Virgo|Libra|Scorpio|Sagittarius|Capricorn|Aquarius|Pisces|January|February|March|April|May|June|July|August|September|October|November|December)\b/;
export function md(text: string): string {
  const html = marked.parse(text ?? "", { renderer, async: false }) as string;
  // Bold signs, months and date windows get a soft lavender background
  return html.replace(/<strong>([^<]{1,48})<\/strong>/g, (m, t) => (HL.test(t) ? `<strong class="hl">${t}</strong>` : m));
}
const baseLink = renderer.link.bind(renderer);
renderer.link = (token) => (/^(https?:|mailto:|\/)/i.test(token.href) ? baseLink(token) : escape(token.text));
