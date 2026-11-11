// Link preview for the homepage: "Vertex Point · Birth Charts & Synastry"
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const alt = "Vertex Point · Birth Charts & Synastry";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OG() {
  const [serif, italic, art] = await Promise.all([
    fetch(new URL("./cormorant-garamond-latin-500-normal.woff", import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL("./cormorant-garamond-latin-400-italic.woff", import.meta.url)).then(r => r.arrayBuffer()),
    fetch(new URL("./og-armillary.jpg", import.meta.url)).then(r => r.arrayBuffer()),
  ]);
  const bytes = new Uint8Array(art);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const src = `data:image/jpeg;base64,${btoa(bin)}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#160818", color: "#f1e9da" }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 0 0 80px", width: 680 }}>
          <div style={{ fontFamily: "Serif", fontSize: 92, lineHeight: 1 }}>Vertex Point</div>
          <div style={{ fontFamily: "Italic", fontSize: 30, color: "#a898ab", marginTop: 16 }}>Some call it the Vertex Point. Some call it destiny.</div>
          <div style={{ fontFamily: "Serif", fontSize: 40, marginTop: 48, color: "#c8c3cf" }}>Birth Charts &amp; Synastry</div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={520} height={630} style={{ objectFit: "cover", objectPosition: "left" }} alt="" />
      </div>
    ),
    { ...size, fonts: [{ name: "Serif", data: serif, weight: 500, style: "normal" }, { name: "Italic", data: italic, weight: 400, style: "italic" }] },
  );
}
