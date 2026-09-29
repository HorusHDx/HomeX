"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContinue, ContinueEntry } from "@/lib/continue";
import { imgUrl } from "@/lib/tmdb";

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

export default function ContinueWatching() {
  const [entries, setEntries] = useState<ContinueEntry[]>([]);

  useEffect(() => {
    setEntries(getContinue());
  }, []);

  if (entries.length === 0) return null;

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>Continuar viendo</h2>
        <span>Sigue donde lo dejaste</span>
      </div>
      <div className="rail-track">
        {entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/watch/tv/${entry.id}?season=${entry.season}&episode=${entry.episode}`}
            className="tile wide"
            title={entry.title}
          >
            <div className="poster">
              <img
                src={entry.poster ? imgUrl(entry.poster, "w500")! : FALLBACK_POSTER}
                alt={entry.title}
                loading="lazy"
              />
              <span className="tile-badge">T{entry.season} E{entry.episode}</span>
              <div className="pop">
                <strong>{entry.title}</strong>
                <small>T{entry.season} E{entry.episode}</small>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
