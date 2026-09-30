"use client";

import { useEffect, useState } from "react";

export default function Splash() {
  // Arranca en "gone" para que el SSR no pinte el logo
  // y no haya flash en Ctrl+F5. Solo se muestra si es
  // la primera vez en esta pestaña (sessionStorage).
  const [phase, setPhase] = useState<"in" | "out" | "gone">("gone");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem("homex:splash") === "1";
    } catch {
      seen = false;
    }
    if (seen) {
      setPhase("gone");
      return;
    }
    try {
      sessionStorage.setItem("homex:splash", "1");
    } catch {}
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
      <div className="splash-inner">
        <span className="logo splash-logo">
          <b>HOME</b>
          <i>X</i>
        </span>
        <div className="splash-bar" aria-hidden="true"><span /></div>
        <span className="splash-load">Cargando…</span>
      </div>
    </div>
  );
}
