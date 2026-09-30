"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Anime2Item } from "@/lib/animeav1";
import PosterImg from "@/components/PosterImg";

export default function Anime2Search() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Anime2Item[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = useCallback((q: string) => {
    const query = q.trim();
    if (!query) {
      setResults(null);
      return;
    }
    setLoading(true);
    fetch(`/api/anime2/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.results || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    const t = setTimeout(() => run(term), 500);
    return () => clearTimeout(t);
  }, [term, run]);

  return (
    <div style={{ marginBottom: "2rem" }}>
      <form
        className="search open"
        style={{ width: "min(420px, 100%)", marginBottom: "1.2rem" }}
        onSubmit={(e) => e.preventDefault()}
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

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton ratio" />
          ))}
        </div>
      )}

      {!loading && results !== null && (
        results.length === 0 ? (
          <div className="state">
            <h3>Sin resultados</h3>
            <p>No se encontró nada para "{term.trim()}"</p>
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
        )
      )}
    </div>
  );
}
