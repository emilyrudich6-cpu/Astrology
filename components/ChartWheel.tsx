// Chart wheel as pure SVG (renders on the server, no libraries).
const SIGN_GLYPHS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂", Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};
const T = "︎"; // force text (not emoji) glyphs

export interface WheelPlanet { name: string; lon: number; retrograde?: boolean }
export interface WheelAspect { a: string; b: string; aspect: string }

export default function ChartWheel({ planets, cusps, asc, aspects = [], spin = false, label }: {
  planets: WheelPlanet[]; cusps?: number[] | null; asc?: number | null; aspects?: WheelAspect[]; spin?: boolean; label: string;
}) {
  const c = 250, rOut = 240, rZod = 200, rPl = 168, rIn = 124;
  const left = asc ?? 0;
  const pt = (lon: number, r: number) => {
    const th = ((180 + (lon - left)) * Math.PI) / 180; // zodiac runs counter-clockwise, Ascendant at 9 o'clock
    return [c + r * Math.cos(th), c - r * Math.sin(th)] as const;
  };
  // spread planets that sit on top of each other
  const placed = [...planets].sort((a, b) => a.lon - b.lon).map(p => ({ ...p, show: p.lon }));
  for (let pass = 0; pass < 3; pass++)
    for (let i = 1; i < placed.length; i++)
      if (placed[i].show - placed[i - 1].show < 10) placed[i].show = placed[i - 1].show + 10;
  const byName = Object.fromEntries(planets.map(p => [p.name, p.lon]));
  const hard = new Set(["square", "opposition"]);
  const drawn = aspects.filter(a => byName[a.a] != null && byName[a.b] != null && ["conjunction", "sextile", "square", "trine", "opposition"].includes(a.aspect) && a.aspect !== "conjunction");

  return (
    <svg className={`wheel${spin ? " spin" : ""}`} viewBox="0 0 500 500" role="img" aria-label={label}>
      <g className="zodiac">
        <circle cx={c} cy={c} r={rOut} fill="none" stroke="var(--line)" />
        <circle cx={c} cy={c} r={rZod} fill="none" stroke="var(--line)" />
        {SIGN_GLYPHS.map((g, i) => {
          const [x1, y1] = pt(i * 30, rZod), [x2, y2] = pt(i * 30, rOut), [gx, gy] = pt(i * 30 + 15, (rZod + rOut) / 2);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--line)" />
              <text x={gx} y={gy} textAnchor="middle" dominantBaseline="central" fontSize="20" fill="var(--muted)">{g + T}</text>
            </g>
          );
        })}
      </g>
      <circle cx={c} cy={c} r={rIn} fill="none" stroke="var(--line)" />
      {cusps?.map((cu, i) => {
        const [x1, y1] = pt(cu, rIn), [x2, y2] = pt(cu, rZod);
        const angle = i === 0 || i === 9;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={angle ? "var(--paper)" : "var(--line)"} strokeWidth={angle ? 1.5 : 1} />;
      })}
      {drawn.map((a, i) => {
        const [x1, y1] = pt(byName[a.a], rIn - 4), [x2, y2] = pt(byName[a.b], rIn - 4);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={hard.has(a.aspect) ? "var(--orchid)" : "var(--muted)"} strokeOpacity={0.7} />;
      })}
      {placed.map(p => {
        const [x, y] = pt(p.show, rPl), [tx, ty] = pt(p.lon, rZod), [tx2, ty2] = pt(p.lon, rZod - 8);
        return (
          <g key={p.name}>
            <line x1={tx} y1={ty} x2={tx2} y2={ty2} stroke="var(--paper)" />
            <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="22" fill="var(--paper)">
              {PLANET_GLYPHS[p.name] + T}
              <title>{`${p.name}${p.retrograde ? " (retrograde)" : ""}`}</title>
            </text>
            {p.retrograde && <text x={x + 11} y={y + 12} fontSize="9" fill="var(--orchid)">R</text>}
          </g>
        );
      })}
    </svg>
  );
}
