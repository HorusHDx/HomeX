"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Anime2Item } from "@/lib/animeav1";
import PosterImg from "@/components/PosterImg";

function Anime2Browser() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Anime2Item[]>([]);
  const [loading, setLoading] = useState(true);

  const run = useCallback((q: string) => {
    setLoading(true);
    fetch(`/api/anime2/search${q ? `?q=${encodeURIComponent(q)}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    run("");
  }, [run]);

  // debounce del buscador propio
  useEffect(() => {
    const t = setTimeout(() => {
      if (query !== term) {
        setQuery(term);
        run(term.trim());
      }
    }, 500);
    return () => clearTimeout(t);
  }, [term, query, run]);

  return (
    <div className="page">
      <h1 className="section-title">Anime2</h1>
      <p className="section-sub">Segundo servidor · AnimeAV1 · subtitulado y doblado</p>

      <form
        className="search open"
        style={{ width: "min(420px, 100%)", marginBottom: "1.6rem" }}
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(term);
          run(term.trim());
        }}
        role="search"
      >
        <span className="search-btn" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </span>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar anime…"
          aria-label="Buscar anime en Anime2"
        />
      </form>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <div key={i} className="skeleton ratio" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="state">
          <h3>Sin resultados</h3>
          <p>No se encontró nada para "{query}"</p>
        </div>
      ) : (
        <div className="grid">
          {results.map((item, i) => (
            <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
              <div className="poster">
                <PosterImg src={item.cover} alt={item.title} eager={i < 6} />
              </div>
              <span className="card-label">{item.title}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Anime2Page() {
  return (
    <Suspense>
      <Anime2Browser />
    </Suspense>
  );
}
