// Saved Friends: private birth profiles a member keeps on their account, shown beside their own Big Three.
// Placements come from the same chart calculator as the free chart; nothing here writes a reading.
import { natalChart, BirthData } from "./engine/natal";
import { uncertainPlacements } from "./engine/dominant";
import { signOf } from "./engine/core";

export const SAVED_FRIENDS_MAX = 30;
export const RELATIONSHIPS = ["friend", "partner", "crush", "ex", "family", "business partner", "coworker"];

export interface BigThree {
  sun: string;
  moon: string | [string, string];   // two signs when the Moon changed sign that day and there's no birth time
  rising: string | null;             // needs a birth time
}

/** Sun, Moon and Rising, following the calculator's rules for an unknown birth time */
export function bigThree(b: BirthData): BigThree {
  const c = natalChart(b);
  const sign = (n: string) => c.planets.find(p => p.name === n)!.sign;
  const moonAlt = uncertainPlacements(b).find(u => u.planet === "Moon")?.signs;
  return { sun: sign("Sun"), moon: moonAlt ? [moonAlt[0], moonAlt[1]] : sign("Moon"), rising: c.angles ? signOf(c.angles[0].lon) : null };
}
