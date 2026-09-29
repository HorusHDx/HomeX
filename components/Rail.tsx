"use client";

import { useRef } from "react";
import Card, { CardSkeleton } from "./Card";
import { TMDBItem } from "@/lib/tmdb";

interface RailProps {
  title: string;
  hint?: string;
  items?: TMDBItem[];
  loading?: boolean;
  count?: number;
  badges?: (string | null)[];
  links?: (string | null)[];
  variant?: "poster" | "top";
}

const Chevron = ({ dir }: { dir: "l" | "r" }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
    <path d={dir === "l" ? "m15 5-7 7 7 7" : "m9 5 7 7-7 7"} />
  </svg>
);

export default function Rail({
  title,
  hint,
  items,
  loading = false,
  count = 8,
  badges,
  links,
  variant = "poster",
}: RailProps) {
  const track = useRef<HTMLDivElement>(null);
  const isTop = variant === "top";
  const list = (items ?? []).filter((i) => !isTop || i.poster_path).slice(0, isTop ? 10 : undefined);

  const scroll = (dir: number) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="rail">
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

      <div className="rail-track" ref={track}>
        {loading && !list.length
          ? Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)
          : list.map((item, i) => {
              const type = item.media_type || (item.title ? "movie" : "tv");
              return (
                <Card
                  key={`${type}-${item.id}`}
                  item={item}
                  badge={badges?.[i] ?? undefined}
                  href={links?.[i] ?? undefined}
                  variant={variant}
                  rank={i + 1}
                />
              );
            })}
      </div>
    </section>
  );
}
