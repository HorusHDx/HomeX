"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TMDBItem, imgUrl } from "@/lib/tmdb";
import Link from "next/link";

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const [results, setResults] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [query]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="skeleton ratio" />
        ))}
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="state">
        <h3>Sin resultados</h3>
        <p>No se encontraron títulos para "{query}"</p>
      </div>
    );
  }

  return (
    <div className="grid">
      {results.map((item) => {
        const type = item.media_type || (item.title ? "movie" : "tv");
        return (
          <Link
            key={`${type}-${item.id}`}
            href={`/detail/${type}/${item.id}`}
            className="card"
          >
            {item.poster_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imgUrl(item.poster_path, "w500")!}
                alt={item.title || item.name}
                loading="lazy"
              />
            ) : (
              <div className="skeleton ratio" />
            )}
            <span className="card-label">
              {item.title || item.name}
              <small>{(item.release_date || item.first_air_date || "").slice(0, 4)}</small>
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="page">
      <h1 className="section-title">Buscar</h1>
      <p className="section-sub">Encuentra películas y series</p>
      <Suspense
        fallback={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }, (_, i) => (
              <div key={i} className="skeleton ratio" />
            ))}
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
