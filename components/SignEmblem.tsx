// Placeholder emblem until Emily's illustrations arrive: thin silver rings, a muted accent glow, the glyph.
export default function SignEmblem({ glyph, accent, size = 180, label }: { glyph: string; accent: string; size?: number; label: string }) {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg className="emblem" width={size} height={size} viewBox="0 0 200 200" role="img" aria-label={label}>
      <defs>
        <radialGradient id={`g${glyph.charCodeAt(0)}`}>
          <stop offset="0" stopColor={accent} stopOpacity=".55" />
          <stop offset="1" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="80" fill={`url(#g${glyph.charCodeAt(0)})`} />
      <circle cx="100" cy="100" r="86" fill="none" stroke="var(--silver)" strokeOpacity=".5" />
      <circle cx="100" cy="100" r="64" fill="none" stroke="var(--silver)" strokeOpacity=".3" />
      <ellipse cx="100" cy="100" rx="86" ry="30" fill="none" stroke="var(--silver)" strokeOpacity=".25" transform="rotate(-20 100 100)" />
      {rays.map(a => {
        const r = (a * Math.PI) / 180, long = a % 90 === 0;
        return <line key={a} x1={100 + 88 * Math.cos(r)} y1={100 + 88 * Math.sin(r)} x2={100 + (long ? 98 : 93) * Math.cos(r)} y2={100 + (long ? 98 : 93) * Math.sin(r)} stroke="var(--silver)" strokeOpacity=".5" />;
      })}
      <text x="100" y="104" textAnchor="middle" dominantBaseline="central" fontSize="64" fill="var(--paper)">{glyph + "︎"}</text>
    </svg>
  );
}
