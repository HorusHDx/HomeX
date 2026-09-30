"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContinue, ContinueEntry } from "@/lib/continue";
import { imgUrl } from "@/lib/tmdb";
import PosterImg from "./PosterImg";

export default function ContinueWatching() {
  const [entries, setEntries] = useState<ContinueEntry[]>([]);

  useEffect(() => {
    const items = getContinue();
    setEntries(items.filter((e) => e.title && e.poster));
  }, []);

  if (entries.length === 0) return null;

  const hrefFor = (entry: ContinueEntry) =>
    entry.media === "movie"
      ? `/watch/movie/${entry.id}`
      : `/watch/tv/${entry.id}?season=${entry.season}&episode=${entry.episode}`;

  const badgeFor = (entry: ContinueEntry) =>
    entry.media === "movie" ? "Película" : `T${entry.season} E${entry.episode}`;

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>Continuar viendo</h2>
        <span>Sigue donde lo dejaste</span>
      </div>
      <div className="rail-track">
        {entries.map((entry) => (
          <Link
            key={`${entry.media}-${entry.id}`}
            href={hrefFor(entry)}
            className="tile wide"
            title={entry.title}
          >
            <div className="poster">
              <PosterImg
                src={entry.poster ? imgUrl(entry.poster, "w500")! : null}
                alt={entry.title}
                eager
              />
              <span className="tile-badge">{badgeFor(entry)}</span>
              <div className="pop">
                <strong>{entry.title}</strong>
                <small>{badgeFor(entry)}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
