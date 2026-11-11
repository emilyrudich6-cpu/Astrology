"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import BirthForm from "./BirthForm";

export default function People({ people, max }: { people: { id: string; name: string; relationship: string }[]; max: number }) {
  const [adding, setAdding] = useState(false);
  const router = useRouter();
  async function remove(id: string, name: string) {
    if (!confirm(`Remove ${name}? Their compatibility reading stays in your inbox.`)) return;
    await fetch(`/api/people?id=${id}`, { method: "DELETE" });
    router.refresh();
  }
  return (
    <div>
      {people.length > 0 && (
        <ul className="inbox" style={{ marginBottom: 14 }}>
          {people.map(p => (
            <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0" }}>
              <span>{p.name} <span className="hint">({p.relationship})</span></span>
              <button className="btn ghost small" onClick={() => remove(p.id, p.name)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
      {people.length < max && !adding && (
        <>
          <p className="hint">Add someone and their compatibility reading arrives on a surprise day within the week. You can save {max - people.length} more.</p>
          <button className="btn" onClick={() => setAdding(true)}>Add a person</button>
        </>
      )}
      {adding && <BirthForm endpoint="/api/people" submitLabel="Save and request reading" withRelationship onDone={() => { setAdding(false); router.refresh(); }} />}
      {people.length >= max && <p className="hint">You've saved {max} people, the most for your plan.</p>}
    </div>
  );
}
