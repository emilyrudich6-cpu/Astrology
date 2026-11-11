import { PLANETS, speedOf } from "../lib/engine/core";
for (const p of PLANETS) {
  const v: number[] = [];
  for (let t = Date.UTC(1925,0,1); t < Date.UTC(2045,0,1); t += 86400000 * 3.7) v.push(Math.abs(speedOf(p, new Date(t))));
  v.sort((a,b)=>a-b); const q = (f:number)=>v[Math.floor(f*v.length)].toFixed(5);
  console.log(p, "mean", (v.reduce((a,b)=>a+b)/v.length).toFixed(5), "p10", q(0.1), "p33", q(0.33), "p67", q(0.67), "max", q(0.999));
}
