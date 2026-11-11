// Server-side helpers for the free chart: one place that turns the URL token into a chart.
import { natalChart } from "./engine/natal";
import { dominantPlanet, uncertainPlacements } from "./engine/dominant";
import { decodeBirth } from "./freechart";

export function freeChart(token: string | null | undefined) {
  const b = decodeBirth(token);
  if (!b) return null;
  const chart = natalChart(b);
  const uncertain = uncertainPlacements(b);
  const uncertainNames = uncertain.map(u => u.planet);
  const dominant = dominantPlanet(chart, uncertainNames);
  // cache key: the birth moment and place only (never the name)
  const key = [b.date, b.time ?? "", b.latitude.toFixed(3), b.longitude.toFixed(3), b.timezone].join("|");
  return { b, chart, uncertain, uncertainNames, dominant, key };
}
