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
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  if (results.length === 0) {
    return <p className="text-gray-400">No se encontraron resultados</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {results.map((item) => {
        const type = item.media_type || (item.title ? "movie" : "tv");
        return (
          <Link
            key={`${type}-${item.id}`}
            href={`/detail/${type}/${item.id}`}
            className="group"
          >
            <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-light">
              {item.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl(item.poster_path, "w500")!}
                  alt={item.title || item.name}
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-600">
                  Sin imagen
                </div>
              )}
            </div>
            <p className="mt-2 text-sm font-medium">{item.title || item.name}</p>
            <p className="text-xs text-gray-400">★ {item.vote_average.toFixed(1)}</p>
          </Link>
        );
      })}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16">
      <h1 className="mb-6 text-2xl font-bold">
        Resultados para: <span className="text-brand">Buscar</span>
      </h1>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
