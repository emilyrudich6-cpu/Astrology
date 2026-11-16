"use client";
import { useState } from "react";
import BirthForm from "./BirthForm";

export default function BuyCompatibility({ price }: { price: string }) {
  const [open, setOpen] = useState(false);
  if (!open) return <button className="btn ghost" onClick={() => setOpen(true)}>Compare our charts · {price}</button>;
  return <BirthForm endpoint="/api/buy" extra={{ product: "synastry" }} withRelationship submitLabel={`Compare our charts · ${price}`} />;
}
