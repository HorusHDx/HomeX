"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

interface HeroCarouselProps {
  items: TMDBItem[];
}

export default function HeroCarousel({ items }: HeroCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const validItems = items.filter((i) => i.backdrop_path);
  const count = validItems.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % count);
  }, [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const interval = setInterval(next, 8000);
    return () => clearInterval(interval);
  }, [paused, next, count]);

  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (count === 0) return null;

  const item = validItems[current];
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const type = item.title ? "movie" : "tv";

  return (
    <div
      className="hero"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="hero-bg" key={item.id}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgUrl(item.backdrop_path, "original")!}
          alt={title}
        />
      </div>

      <div className="hero-body" key={`body-${item.id}`}>
        <span className="hero-tag">HomeX Original</span>
        <h1 className="hero-title">{title}</h1>
        <div className="hero-meta">
          <span className="score">★ {item.vote_average.toFixed(1)}</span>
          {year && <span>{year}</span>}
          <span className="badge">HD</span>
        </div>
        <p className="hero-overview">{item.overview}</p>
        <div className="hero-actions">
          <Link
            href={`/watch/${type}/${item.id}`}
            className="btn btn-primary"
          >
            ▶ Reproducir
          </Link>
          <Link
            href={`/detail/${type}/${item.id}`}
            className="btn btn-ghost"
          >
            Más info
          </Link>
        </div>
      </div>

      <div className="hero-dots">
        {validItems.map((_, i) => (
          <button
            key={i}
            className={i === current ? "on" : ""}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
