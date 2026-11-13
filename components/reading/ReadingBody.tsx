import FullChartView from "./FullChartView";
import SynastryView from "./SynastryView";

/** Readings stored as a JSON document ({"v": ...}) render with their own layout. */
export default function ReadingBody({ body }: { body: string }) {
  let doc: any;
  try { doc = JSON.parse(body); } catch { return <p className="narrow">This reading couldn't be displayed.</p>; }
  if (doc?.v === "fullchart1") return <FullChartView doc={doc} />;
  if (doc?.v === "synastry1") return <SynastryView doc={doc} />;
  return <p className="narrow">This reading couldn't be displayed.</p>;
}
