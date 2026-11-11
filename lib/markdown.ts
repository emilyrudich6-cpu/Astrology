import { marked, Renderer } from "marked";
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const renderer = new Renderer();
renderer.html = ({ text }) => escape(text); // never pass raw HTML through
export function md(text: string): string {
  return marked.parse(text ?? "", { renderer, async: false }) as string;
}
const baseLink = renderer.link.bind(renderer);
renderer.link = (token) => (/^(https?:|mailto:|\/)/i.test(token.href) ? baseLink(token) : escape(token.text));
