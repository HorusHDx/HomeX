"use client";

import { useEffect, useState } from "react";

export default function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">("gone");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("homex:splash") === "1";
      sessionStorage.setItem("homex:splash", "1");
    } catch {}
    if (seen) return;
    setPhase("in");
    const t1 = setTimeout(() => setPhase("out"), 1100);
    const t2 = setTimeout(() => setPhase("gone"), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (phase === "gone") return null;

  return (
    <div className={`splash${phase === "out" ? " out" : ""}`} aria-hidden="true">
      <span className="logo">
        <b>HOME</b>
        <i>X</i>
      </span>
    </div>
  );
}
