"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAnime2Continue, type Anime2Entry } from "@/lib/continue";
import PosterImg from "./PosterImg";
import Anime2Rail from "@/app/anime2/Anime2Rail";

export default function Anime2ContinueWatching() {
  const [entries, setEntries] = useState<Anime2Entry[]>([]);

  useEffect(() => {
    setEntries(getAnime2Continue().filter((e) => e.title));
  }, []);

  if (entries.length === 0) return null;

  return (
    <Anime2Rail title="Continuar viendo" hint="Sigue donde lo dejaste">
      {entries.map((entry) => (
        <Link
          key={entry.slug}
          href={`/anime2/${entry.slug}/${entry.episode}`}
          className="card"
          style={{ width: "clamp(200px, 20vw, 280px)" }}
          title={entry.title}
        >
          <div className="poster landscape">
            <PosterImg src={entry.cover} alt={entry.title} eager />
          </div>
          <span className="card-badge">E{entry.episode}</span>
          <span className="card-label show">{entry.title}</span>
        </Link>
      ))}
    </Anime2Rail>
  );
}
