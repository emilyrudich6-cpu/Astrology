// Share card image for "Share my Big Three". Signs only: never a birth date, time or place.
import { ImageResponse } from "next/og";
export const runtime = "edge";

const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const GLYPH: Record<string, string> = { Aries:"♈",Taurus:"♉",Gemini:"♊",Cancer:"♋",Leo:"♌",Virgo:"♍",Libra:"♎",Scorpio:"♏",Sagittarius:"♐",Capricorn:"♑",Aquarius:"♒",Pisces:"♓" };
const clean = (s: string | null) => (s && SIGNS.includes(s) ? s : null);

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const sun = clean(q.get("s")), moon = clean(q.get("m")), rising = clean(q.get("r"));
  const name = (q.get("n") ?? "").replace(/[^\p{L}\p{M} '\-]/gu, "").slice(0, 24);
  const [serif, italic] = await Promise.all([
    fetch(new URL("./cormorant-garamond-latin-500-normal.woff", import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL("./cormorant-garamond-latin-400-italic.woff", import.meta.url)).then(r => r.arrayBuffer()),
  ]);
  const cell = (label: string, sign: string | null) => (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 300, padding: "26px 0", border: "1px solid #3b2a42", borderRadius: 24, background: "#21102a" }}>
      <div style={{ fontSize: 26, color: "#a898ab", fontFamily: "Body" }}>{label}</div>
      <div style={{ fontSize: 64, color: "#f1e9da", fontFamily: "Serif", marginTop: 6 }}>{sign ?? "—"}</div>
    </div>
  );
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        background: "radial-gradient(circle at 70% 30%, #3a1f52 0%, #160818 55%)", color: "#f1e9da" }}>
        <div style={{ fontFamily: "Italic", fontSize: 44, color: "#c8c3cf" }}>{name ? `${name}'s Big Three` : "My Big Three"}</div>
        <div style={{ display: "flex", gap: 28, marginTop: 34 }}>
          {cell("Sun", sun)}{cell("Moon", moon)}{cell("Rising", rising)}
        </div>
        <div style={{ display: "flex", marginTop: 46, fontFamily: "Serif", fontSize: 34 }}>Vertex Point</div>
        <div style={{ display: "flex", fontFamily: "Italic", fontSize: 24, color: "#a898ab", marginTop: 4 }}>vertexpoint.talk</div>
      </div>
    ),
    { width: 1200, height: 630, fonts: [
      { name: "Serif", data: serif, weight: 500, style: "normal" },
      { name: "Italic", data: italic, weight: 400, style: "italic" },
      { name: "Body", data: serif, weight: 500, style: "normal" },
    ] },
  );
}

