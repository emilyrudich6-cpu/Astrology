import ChartWheel from "@/components/ChartWheel";
import PrintButton from "./PrintButton";
import { Rich, Inline, byId } from "./Rich";
import type { FullChartDoc } from "@/lib/fullchart";
import { SIGN_ART } from "@/lib/sign-art";

function Section({ title, intro, children, id }: { title: string; intro?: string; children: React.ReactNode; id?: string }) {
  return (
    <section className="doc-section" id={id}>
      <h2>{title}</h2>
      {intro && <p className="doc-intro">{intro}</p>}
      {children}
    </section>
  );
}

function Table({ head, rows, className }: { head: string[]; rows: (React.ReactNode)[][]; className?: string }) {
  return (
    <div className="doc-table-wrap">
      <table className={`doc-table ${className ?? ""}`}>
        <thead><tr>{head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

export default function FullChartView({ doc }: { doc: FullChartDoc }) {
  const { calc: c, text: t } = doc;
  const h = c.header;
  const art = SIGN_ART[h.sunSign];
  const line = (label: string) => t.glanceLines?.find(g => g.label === label)?.line ?? "";
  const footer = `${h.name} · The Full Chart · ${h.born}`;

  return (
    <div className="doc" data-footer={footer}>
      <header className="doc-cover">
        {art && <img className="doc-cover-art" src={art} alt={`${h.sunSign} artwork`} width={400} height={600} />}
        <div className="doc-cover-text">
          <h1>{h.name}</h1>
          <p className="doc-cover-sub">The Full Chart, and what comes next</p>
          <p>{h.born}</p>
          <p className="doc-cover-three">{h.bigThree}</p>
          <div className="doc-cover-wheel">
            <ChartWheel planets={c.wheel.planets} cusps={c.wheel.cusps} asc={c.wheel.asc} aspects={c.wheel.aspects} label={`${h.name}'s birth chart`} />
          </div>
          <p className="doc-fine">Tropical zodiac · Placidus houses · Prepared {h.prepared} · For entertainment and self-reflection</p>
          <PrintButton />
        </div>
      </header>

      {h.warnings.length > 0 && <div className="notice">{h.warnings.join(" ")}</div>}

      <Section title="At a Glance">
        <Rich text={t.glanceIntro} className="doc-lede" />
        <Table head={["Signature", "Placement", "In one line"]} rows={c.glance.map(g => [g.label, g.placement, line(g.label)])} />
        <div className="doc-callout">
          <h3>The headline</h3>
          <Rich text={t.headline} />
        </div>
      </Section>

      {t.angles?.length > 0 && c.wheel.asc != null && (
        <Section title="The Angles" intro="The angles are the most personal points in a chart. They depend on your exact birth minute and place. (Your Descendant, the partner point, is read in your synastry readings.)">
          {t.angles.filter(a => !/descendant/i.test(a.name)).map((a, i) => (
            <div key={i} className="doc-item">
              <h3>{a.name} <span className="doc-sub">— {a.subtitle}</span></h3>
              <Rich text={a.text} />
            </div>
          ))}
        </Section>
      )}

      <Section title="Planets, Houses & Speeds">
        <Table head={["Body", "Position", "House", "Speed at birth", "Condition"]}
          rows={c.planetRows.map(p => [p.body, p.position, p.house, p.speed, p.condition])} className="doc-table-dense" />
        <h3 className="doc-h3">Planet by planet</h3>
        {t.planets?.map((p, i) => (
          <div key={i} className="doc-item"><h4>{p.heading}</h4><Rich text={p.text} /></div>
        ))}
      </Section>

      {c.houseRows && (
        <Section title="The Houses">
          <Table head={["House", "Cusp", "Ruler & where it lives", "What's inside"]} rows={c.houseRows.map(r => [r.house, r.cusp, r.ruler, r.inside])} />
          <p><strong>Where the weight sits:</strong> <Inline text={t.housesWeight} /></p>
          {t.hemispheres && <p><strong>Hemispheres:</strong> <Inline text={t.hemispheres} /></p>}
          {t.wholeSign && <p><strong>Whole-sign check:</strong> <Inline text={t.wholeSign} /></p>}
        </Section>
      )}

      <Section title="Aspects" intro={`Aspects are the conversations between planets, ranked here by tightness of orb: the tighter, the louder. "A" means applying (getting stronger), "S" separating.`}>
        <Table head={["Aspect", "Orb", "", "What it means for you"]}
          rows={c.aspectRows.map((a, i) => [a.aspect, a.orb, a.motion, byId(t.aspectMeanings, a.id, i)?.meaning ?? ""])} />
        {t.minorNote && <p><strong>Minor aspects worth knowing:</strong> <Inline text={t.minorNote} /></p>}
        {t.patterns?.length > 0 && <h3 className="doc-h3">Aspect patterns</h3>}
        {t.patterns?.map((p, i) => <div key={i} className="doc-item"><h4>{p.title}</h4><Rich text={p.text} /></div>)}
        <div className="doc-item"><h4>Chart shape: the {c.glance.find(g => g.label === "Chart shape")?.placement}</h4><Rich text={t.shape} /></div>
      </Section>

      <Section title="Planet Speeds" intro="How fast a planet was moving when you were born changes how it behaves. Fast planets act quickly and outwardly; slow or stationary ones are concentrated; retrograde ones turn inward.">
        <ul className="doc-list">{t.speeds?.map((s, i) => <li key={i}><strong>{s.label}.</strong> <Inline text={s.text} /></li>)}</ul>
        <h3 className="doc-h3">Declinations (the hidden aspects)</h3>
        <Rich text={t.declinations} />
      </Section>

      {(c.natalRetros.length > 0 || t.stationNote) && (
        <Section title="Your Natal Retrogrades">
          {c.natalRetros.length > 0 && <Table head={["Planet", "Natal", "Turns direct by progression", "Meaning"]}
            rows={c.natalRetros.map(r => [r.planet, r.natal, r.turnsDirect, t.natalRetros?.find(x => x.planet === r.planet)?.meaning ?? ""])} />}
          {t.natalRetros?.map((r, i) => <div key={i} className="doc-item"><h4>{r.planet.replace(" Rx", " retrograde")}</h4><Rich text={r.text} /></div>)}
          {t.stationNote && <p><strong>Bonus:</strong> <Inline text={t.stationNote} /></p>}
        </Section>
      )}

      <Section title="The next retrograde periods, and how they'll hit you">
        <Table head={["Retrograde", "Dates", "Where in your chart", "What to expect"]}
          rows={c.retros.map((r, i) => [r.retrograde, r.dates, r.where, byId(t.retroNotes, r.id, i)?.expect ?? ""])} />
      </Section>

      <Section title="Harmonic Charts" intro="Harmonic charts multiply every position by a number to reveal hidden patterns. Planets that cluster together in a harmonic chart work as a team in that area of life.">
        {t.harmonics?.map((x, i) => <div key={i} className="doc-item"><h4>{x.title}</h4><Rich text={x.text} /></div>)}
      </Section>

      <Section title="Dominants, Elements & Stars">
        <div className="doc-item"><h4>Dominant planets</h4><Rich text={t.dominants} /></div>
        <div className="doc-item"><h4>Elements and modes</h4><Rich text={t.elementsText} /></div>
        {c.stars.length > 0 && <>
          <h4>Fixed stars on your chart</h4>
          <Table head={["Star", "On your…", "Orb", "Traditional flavour"]} rows={c.stars.map(s => [s.star, s.on, s.orb, s.flavour])} />
        </>}
        <div className="doc-item"><h4>Eclipses and the Moon around your birth</h4><Rich text={t.eclipses} /></div>
      </Section>

      <Section title="Where You Are Now: Progressions" intro={`Secondary progressions move your chart forward one day for each year of life. They show your inner evolution. As of ${new Date(c.progAsOf.date).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })} (age ${c.progAsOf.age}):`}>
        <Table head={["Progressed point", "Position", "What it says"]} rows={c.progRows.map((p, i) => [p.point, p.position, byId(t.progNotes, p.id, i)?.says ?? ""])} />
        <h3 className="doc-h3">Progressed milestones ahead</h3>
        <ul className="doc-list">{c.milestones.map((m, i) => <li key={m.id}><strong>{m.when}</strong> — {m.event}{byId(t.milestoneNotes, m.id, i)?.meaning ? <>: <Inline text={byId(t.milestoneNotes, m.id, i)!.meaning} /></> : null}</li>)}</ul>
      </Section>

      <Section title={`Your Timeline: ${h.timelineSpan}`} intro="Outer-planet transits are felt for weeks before and after the exact date. Several dates mean several passes because of retrogrades; the last one is usually the integration pass.">
        <h3 className="doc-h3">Today's sky: {h.prepared}</h3>
        <Rich text={t.todayIntro} />
        <ul className="doc-list">{t.todayBullets?.map((b, i) => <li key={i}><Inline text={b} /></li>)}</ul>
        <h3 className="doc-h3">The big stories</h3>
        {t.stories?.map((s, i) => <div key={i} className="doc-item"><h4>{i + 1}. {s.title}</h4><Rich text={s.text} /></div>)}
        <h3 className="doc-h3">Date by date</h3>
        <Table head={["Date", "Transit", "Feel"]} rows={c.timelineRows.map((r, i) => [r.date, r.transit, byId(t.dateFeels, r.id, i)?.feel ?? ""])} className="doc-table-dense" />
        {t.otherCurrents && <p className="doc-fine"><Inline text={t.otherCurrents} /></p>}
      </Section>

      {c.hd && (
        <Section title="Bonus: Human Design" intro={`Calculated from the same birth data (Design date: ${new Date(c.hd.designDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}, when the Sun was 88° earlier).`}>
          <Table head={["Element", "Yours", "In plain English"]} rows={([
            ["Type", c.hd.type], ["Strategy", c.hd.strategy], ["Authority", c.hd.authority], ["Profile", c.hd.profile],
            ["Definition", c.hd.definition], ["Incarnation Cross", c.hd.incarnationCross],
            ["Defined centres", c.hd.definedCenters.join(", ") || "None"], ["Open centres", c.hd.openCenters.join(", ") || "None"],
            ["Channels", c.hd.channels.join(" · ") || "None"], ["Signature / not-self", c.hd.signature],
          ] as [string, string][]).map(([k, v], i) => [k, v, (t.hdPlain?.find(x => x.element.toLowerCase().startsWith(k.toLowerCase().slice(0, 6))) ?? t.hdPlain?.[i])?.plain ?? ""])} />
          <Rich text={t.hdEchoes} />
        </Section>
      )}

      <Section title="Bonus: Numerology">
        <p><strong>Life Path {c.numerology.lifePath.number}</strong> ({c.numerology.lifePath.working}). Personal Years: {c.numerology.personalYears.map(y => `${y.year} is a ${y.number}`).join(", ")}.</p>
        <Rich text={t.numerology} />
      </Section>

      <Section title="Everything Else You Should Know" intro="The cheat sheet: the ten things in this chart that matter most.">
        <ul className="doc-list">{t.cheatSheet?.map((x, i) => <li key={i}><strong>{x.lead}</strong> <Inline text={x.text} /></li>)}</ul>
        <div className="doc-two">
          <div><h4>Lucky / easy</h4><ul className="doc-list">{t.lucky?.map((x, i) => <li key={i}><Inline text={x} /></li>)}</ul></div>
          <div><h4>Growth / stretch</h4><ul className="doc-list">{t.growth?.map((x, i) => <li key={i}><Inline text={x} /></li>)}</ul></div>
        </div>
      </Section>

      {t.ritual && (
        <Section title={`Manifestation Ritual: ${t.ritual.title}`}>
          <p className="doc-callout"><Inline text={t.ritual.when} /></p>
          <Rich text={t.ritual.intro} />
          {t.ritual.before && <><h4>Before</h4><Rich text={t.ritual.before} /></>}
          <h4>The ritual</h4>
          <ul className="doc-list">{t.ritual.steps?.map((s, i) => <li key={i}><strong>{s.lead}:</strong> <Inline text={s.text} /></li>)}</ul>
          {t.ritual.followUp && <p><strong>Optional follow-up:</strong> <Inline text={t.ritual.followUp} /></p>}
        </Section>
      )}

      <section className="doc-section doc-fine">
        <h3>How this was calculated</h3>
        <p>Tropical zodiac, Placidus houses, true lunar node (mean node in brackets), mean Black Moon Lilith. Aspect orbs up to 8° for majors and 2° for minors. Transit dates are exact-hit dates in Universal Time, so the local date can be a day earlier. Human Design uses the standard 88° solar-arc Design calculation. Chiron and the Vertex aren't included, and the Descendant is saved for your synastry readings.</p>
        <p>Astrology, Human Design and numerology are frameworks for reflection and fun. This reading is for entertainment and self-exploration, not a prediction of fixed outcomes.</p>
      </section>
    </div>
  );
}
