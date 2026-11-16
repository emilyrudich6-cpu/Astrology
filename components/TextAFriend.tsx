"use client";
import { useState } from "react";

const MESSAGE = "Hey, check out Vertex Point. You get a free birth chart, and we can compare ours:";

/** Opens the phone's share menu (Messages, WhatsApp and so on) with a ready-made invite. No contacts are read. */
export default function TextAFriend({ url }: { url: string }) {
  const [note, setNote] = useState("");
  async function share() {
    setNote("");
    try {
      if (navigator.share) { await navigator.share({ text: MESSAGE, url }); return; }
      await navigator.clipboard.writeText(`${MESSAGE} ${url}`);
      setNote("Invite copied. Paste it into a message.");
    } catch (e) {
      if ((e as Error)?.name !== "AbortError") setNote(`Copy this link: ${url}`);
    }
  }
  return (
    <section className="panel" id="invite">
      <h3>Invite a friend</h3>
      <p className="hint">Send a friend the link to get their free chart. Once they have theirs, add them to Saved Friends and compare.</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" className="btn ghost" onClick={share}>Text a friend</button>
        <a className="hint" href={`sms:?&body=${encodeURIComponent(`${MESSAGE} ${url}`)}`}>Open Messages</a>
      </div>
      {note && <p className="hint" role="status">{note}</p>}
    </section>
  );
}
