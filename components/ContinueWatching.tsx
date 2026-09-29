"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContinue, ContinueEntry } from "@/lib/continue";
import { imgUrl } from "@/lib/tmdb";

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
            className="card"
            title={entry.title}
          >
            {entry.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl(entry.poster, "w500")!}
                alt={entry.title}
                loading="lazy"
              />
            ) : (
              <div className="skeleton ratio" />
            )}
            <span className="card-badge">T{entry.season} E{entry.episode}</span>
            <span className="card-label">
              {entry.title}
              <small>T{entry.season} E{entry.episode}</small>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
