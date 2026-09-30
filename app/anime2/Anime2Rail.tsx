"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  title: string;
  hint?: string;
  children: React.ReactNode;
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d={dir === "l" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
  </svg>
);

export default function Anime2Rail({ title, hint, children }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const updateEdges = () => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 8);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 8);
  };

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, []);

  const scroll = (dir: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className={`rail${atStart ? " at-start" : ""}${atEnd ? " at-end" : ""}`}>
      <div className="rail-head">
        <h2>{title}</h2>
        {hint && <span>{hint}</span>}
      </div>
      <div className="rail-fade l" aria-hidden="true" />
      <div className="rail-fade r" aria-hidden="true" />
      <button className="rail-arr l" onClick={() => scroll(-1)} aria-label="Anterior">
        <Chevron dir="l" />
      </button>
      <button className="rail-arr r" onClick={() => scroll(1)} aria-label="Siguiente">
        <Chevron dir="r" />
      </button>
      <div className="rail-track" ref={track} onScroll={updateEdges}>
        {children}
      </div>
    </section>
  );
}
