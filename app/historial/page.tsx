"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getContinue, clearContinue, ContinueEntry } from "@/lib/continue";
import { imgUrl } from "@/lib/tmdb";
import PosterImg from "@/components/PosterImg";

export default function HistorialPage() {
  const [entries, setEntries] = useState<ContinueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setEntries(getContinue());
    setLoading(false);
  }, []);

  const handleClearAll = () => {
    if (confirm("¿Limpiar todo el historial?")) {
      localStorage.removeItem("homex:continue:v1");
      setEntries([]);
    }
  };

  const handleRemove = (id: number, media: string) => {
    clearContinue(id);
    setEntries(getContinue());
  };

  const hrefFor = (entry: ContinueEntry) =>
    entry.media === "movie"
      ? `/watch/movie/${entry.id}`
      : `/watch/tv/${entry.id}?season=${entry.season}&episode=${entry.episode}`;

  const badgeFor = (entry: ContinueEntry) =>
    entry.media === "movie" ? "Película" : `T${entry.season} E${entry.episode}`;

  return (
    <div className="page">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="section-title">Historial</h1>
          <p className="section-sub">Tu actividad de visualización</p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handleClearAll}
            className="btn btn-ghost"
            style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}
          >
            Limpiar todo
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton ratio" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="state">
          <h3>Sin historial</h3>
          <p>Cuando veas series, aparecerán aquí.</p>
          <Link href="/" className="btn btn-primary">
            Explorar contenido
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {entries.map((entry) => (
            <div key={`${entry.media}-${entry.id}`} className="group relative">
              <Link
                href={hrefFor(entry)}
                className="card"
              >
                {entry.poster ? (
                  <PosterImg
                    src={imgUrl(entry.poster, "w500")!}
                    alt={entry.title}
                  />
                ) : (
                  <div className="skeleton ratio" />
                )}
                <span className="card-badge">{badgeFor(entry)}</span>
                <span className="card-label">
                  {entry.title}
                  <small>{badgeFor(entry)}</small>
                </span>
              </Link>
              <button
                onClick={() => handleRemove(entry.id, entry.media)}
                className="absolute top-2 right-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-brand"
                aria-label={`Eliminar ${entry.title}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
