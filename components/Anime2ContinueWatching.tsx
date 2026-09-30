"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAnime2Continue, patchAnime2Cover, type Anime2Entry } from "@/lib/continue";
import PosterImg from "./PosterImg";
import Anime2Rail from "@/app/anime2/Anime2Rail";

export default function Anime2ContinueWatching() {
  const [entries, setEntries] = useState<Anime2Entry[]>([]);

  useEffect(() => {
    const list = getAnime2Continue().filter((e) => e.title);
    setEntries(list);
    // Autocura: entradas viejas sin portada (el scraper no la daba antes)
    for (const e of list.filter((x) => !x.cover)) {
      fetch(`/api/anime2/info?slug=${encodeURIComponent(e.slug)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((info) => {
          if (info?.cover) {
            patchAnime2Cover(e.slug, info.cover);
            setEntries((prev) => prev.map((p) => (p.slug === e.slug ? { ...p, cover: info.cover } : p)));
          }
        })
        .catch(() => {});
    }
  }, []);

  if (entries.length === 0) return null;

  return (
    <Anime2Rail title="Continuar viendo" hint="Sigue donde lo dejaste">
      {entries.map((entry) => (
        <Link
          key={entry.slug}
          href={`/anime2/${entry.slug}/${entry.episode}`}
          className="card"
          title={entry.title}
        >
          <div className="poster">
            <PosterImg src={entry.cover} alt={entry.title} eager />
          </div>
          <span className="card-badge">E{entry.episode}</span>
          <span className="card-label show">{entry.title}</span>
        </Link>
      ))}
    </Anime2Rail>
  );
}
