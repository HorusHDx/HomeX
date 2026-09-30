"use client";

import { useEffect, useState } from "react";

export default function Splash() {
  const [phase, setPhase] = useState<"in" | "out" | "gone">(() => {
    try {
      return sessionStorage.getItem("homex:splash") === "1" ? "gone" : "in";
    } catch {
      return "in";
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("homex:splash", "1");
    } catch {}
    if (phase === "gone") return;
    const t1 = setTimeout(() => setPhase("out"), 1100);
    const t2 = setTimeout(() => setPhase("gone"), 1700);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [phase]);

  if (phase === "gone") return null;

  return (
    <div className={`splash${phase === "out" ? " out" : ""}`} aria-hidden="true">
      <div className="splash-inner">
        <span className="logo">
          <b>HOME</b>
          <i>X</i>
        </span>
        <div className="splash-bar" aria-hidden="true"><span /></div>
      </div>
    </div>
  );
}
