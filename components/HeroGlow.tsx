"use client";

import { useEffect, useState } from "react";

interface Slide {
  backdrop: string;
  color: string;
}

export default function HeroGlow({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div
      className="glow"
      style={{ background: slides[current]?.color || "#1e3a5f" }}
    />
  );
}
