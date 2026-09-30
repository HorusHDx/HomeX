"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { TMDBItem } from "@/lib/tmdb";
import { genreNames } from "@/lib/genres";

const GLOWS = ["#1e3a5f", "#3b4a63", "#28405f", "#2f4468", "#3a5580", "#334157"];
const backdrop = (path: string) => `https://image.tmdb.org/t/p/w780${path}`;

function scoreClass(v: number): string {
  if (v >= 7) return "score good";
  if (v >= 5.5) return "score mid";
  if (v > 0) return "score low";
  return "score";
}

export default function HeroCarousel({ items }: { items: TMDBItem[] }) {
  const slides = items.filter((i) => i.backdrop_path).slice(0, 6);
  const count = slides.length;
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setCur((c) => (c + 1) % Math.max(count, 1)), [count]);

  // Autoplay con pausa en hover
  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setTimeout(next, 7000);
    return () => clearTimeout(t);
  }, [cur, paused, count, next]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      if (el && /INPUT|TEXTAREA/.test(el.tagName)) return;
      if (document.body.style.overflow === "hidden") return;
      if (e.key === "ArrowRight") setCur((c) => (c + 1) % count);
      if (e.key === "ArrowLeft") setCur((c) => (c - 1 + count) % count);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  if (count === 0) return null;

  return (
    <section
      className={`hero${paused ? " paused" : ""}`}
      style={{ "--gc": GLOWS[cur % GLOWS.length] } as React.CSSProperties}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Destacados"
    >
      {slides.map((item, i) => {
        const title = item.title || item.name || "";
        const year = (item.release_date || item.first_air_date || "").slice(0, 4);
        const type = item.media_type || (item.title ? "movie" : "tv");
        const genres = genreNames(item.genre_ids, 2);
        const on = i === cur;
        const tab = on ? 0 : -1;
        return (
          <article key={`${type}-${item.id}-${i}`} className={`slide${on ? " on" : ""}`} aria-hidden={!on}>
            <div className="slide-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={backdrop(item.backdrop_path!)}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
              />
            </div>
            <div className="slide-copy">
              <div className="slide-kind">
                <span className="dot" aria-hidden="true" />
                {i === 0 ? "Nº 1 en tendencia" : `Destacado #${i + 1}`} · {type === "movie" ? "Película" : "Serie"}
              </div>
              <h1 className="slide-title">{title}</h1>
              <div className="slide-meta">
                {item.vote_average > 0 && (
                  <span className="meta-pill">
                    <span className={scoreClass(item.vote_average)}>★ {item.vote_average.toFixed(1)}</span>
                  </span>
                )}
                {year && <span className="meta-pill">{year}</span>}
                {genres.map((g) => (
                  <span key={g} className="meta-pill">{g}</span>
                ))}
              </div>
              <p className="slide-desc">{item.overview}</p>
              <div className="slide-actions">
                <Link href={type === "movie" ? `/watch/${type}/${item.id}` : `/detail/${type}/${item.id}`} className="btn btn-primary" tabIndex={tab}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 4v16l13-8z" />
                  </svg>
                  {type === "movie" ? "Reproducir" : "Ver episodios"}
                </Link>
                <Link href={`/detail/${type}/${item.id}`} className="btn btn-ghost" tabIndex={tab}>
                  Más info
                </Link>
              </div>
            </div>
          </article>
        );
      })}

      <div className="hero-glow" aria-hidden="true" />

      <div className="hero-bars">
        {slides.map((s, i) => (
          <button
            key={`${s.media_type || (s.title ? "movie" : "tv")}-${s.id}-${i}`}
            className={`hero-bar${i === cur ? " on" : i < cur ? " done" : ""}`}
            onClick={() => setCur(i)}
            aria-label={`Ir al destacado ${i + 1}`}
            aria-current={i === cur}
          >
            <span onAnimationEnd={i === cur ? next : undefined} />
          </button>
        ))}
      </div>
    </section>
  );
}
