"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { TMDBItem, imgUrl } from "@/lib/tmdb";
import { useQuickView } from "./QuickView";

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface CardProps {
  item: TMDBItem;
  showLabel?: boolean;
  badge?: string;
  href?: string;
  variant?: "poster" | "top";
  rank?: number;
}

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4v16l13-8z" />
  </svg>
);

export default function Card({ item, badge, href, variant = "poster", rank }: CardProps) {
  const { open } = useQuickView();
  const type = item.media_type || (item.title ? "movie" : "tv");
  const destination = href || `/detail/${type}/${item.id}`;
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const kind = type === "movie" ? "Película" : "Serie";

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (href || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(item, type, e.currentTarget);
  };

  return (
    <Link
      href={destination}
      onClick={onClick}
      className={`tile${variant === "top" ? " top" : ""}`}
      title={title}
    >
      {variant === "top" && rank != null && (
        <span className="tile-num" aria-hidden="true">{rank}</span>
      )}
      <div className="poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.poster_path ? imgUrl(item.poster_path, "w500")! : FALLBACK_POSTER}
          alt={title}
          loading="lazy"
        />
        {badge && <span className="tile-badge">{badge}</span>}
        {variant !== "top" && item.vote_average > 0 && (
          <span className="tile-score">{item.vote_average.toFixed(1)}</span>
        )}
        <div className="pop">
          <strong>{title}</strong>
          <small>{[year, kind].filter(Boolean).join(", ")}</small>
          <span className="pop-play" aria-hidden="true"><PlayIcon /></span>
        </div>
      </div>
      {variant !== "top" && <div className="tile-cap">{title}</div>}
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="skeleton ratio" aria-hidden="true" />;
}
