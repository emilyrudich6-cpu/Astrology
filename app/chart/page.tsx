import type { Metadata } from "next";
import FreeChartForm from "@/components/FreeChartForm";

export const metadata: Metadata = { title: "Your free chart · Vertex Point" };

export default function ChartPage() {
  return (
    <section className="narrow" style={{ paddingBlock: "24px 40px" }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Your free chart</h1>
      <p className="hint" style={{ marginBottom: 26 }}>The sky at the moment and place you were born, calculated to the minute.</p>
      <FreeChartForm />
    </section>
  );
}
