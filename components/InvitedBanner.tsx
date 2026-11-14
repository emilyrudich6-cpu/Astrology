"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

/** A small welcome for people who arrived through a friend's invite link */
export default function InvitedBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(/(?:^|; )vp_ref=/.test(document.cookie) && new URLSearchParams(location.search).has("invited")); }, []);
  if (!show) return null;
  return (
    <div className="wrap"><p className="notice invited">A friend invited you ♡ <Link href="/login?next=%2Fonboarding">Create your free account</Link> and add your birth details to get your free chart.</p></div>
  );
}
