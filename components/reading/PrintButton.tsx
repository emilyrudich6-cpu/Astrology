"use client";
export default function PrintButton({ label = "Save as PDF" }: { label?: string }) {
  return <button type="button" className="btn ghost no-print" onClick={() => window.print()}>{label}</button>;
}
