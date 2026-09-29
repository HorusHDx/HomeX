"use client";

import { useEffect, useState } from "react";

export default function SplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="splash" aria-hidden="true">
      <span className="splash-logo">
        <b>HOME</b>
        <i>X</i>
      </span>
    </div>
  );
}
