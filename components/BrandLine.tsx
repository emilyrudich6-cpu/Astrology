"use client";
import { usePathname } from "next/navigation";
/** "Some call it the Vertex Point. Some call it destiny." under the wordmark, on the homepage only */
export default function BrandLine({ text }: { text: string }) {
  return usePathname() === "/" ? <span className="brand-line">{text}</span> : null;
}
