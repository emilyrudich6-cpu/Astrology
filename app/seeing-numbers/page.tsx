import type { Metadata } from "next";
import SeeingNumbers from "@/components/SeeingNumbers";

export const metadata: Metadata = { title: "Seeing Numbers · Vertex Point", description: "A private journal for the numbers you keep seeing." };

export default function Page() {
  return (
    <section className="narrow" style={{ padding: "36px 22px 90px" }}>
      <h1 style={{ fontSize: "var(--step-3)" }}>Seeing Numbers</h1>
      <p className="hint">Keep seeing 11:11, 222 or your own birthday? Write down what you saw and what was on your mind. Over time, you'll see which numbers show up and when.</p>
      <SeeingNumbers />
    </section>
  );
}
