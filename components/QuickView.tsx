"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MediaType, TMDBItem, imgUrl } from "@/lib/tmdb";
import { genreNames } from "@/lib/genres";

type OpenFn = (item: TMDBItem, type: MediaType, trigger?: HTMLElement | null) => void;

const QuickViewContext = createContext<{ open: OpenFn }>({ open: () => {} });
export const useQuickView = () => useContext(QuickViewContext);

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4v16l13-8z" />
  </svg>
);

export default function QuickViewProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{ item: TMDBItem; type: MediaType } | null>(null);
  const [show, setShow] = useState(false);
  const trigger = useRef<HTMLElement | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const open = useCallback<OpenFn>((item, type, t) => {
    trigger.current = t ?? null;
    setState({ item, type });
    requestAnimationFrame(() => setShow(true));
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setShow(false);
    setTimeout(() => {
      setState(null);
      if (restoreFocus) trigger.current?.focus();
    }, 220);
  }, []);

  useEffect(() => {
    if (!state) return;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [state, close]);

  const item = state?.item;
  const type = state?.type;
  const title = item?.title || item?.name || "";
  const year = (item?.release_date || item?.first_air_date || "").slice(0, 4);
  const art = item ? imgUrl(item.backdrop_path, "w780") || imgUrl(item.poster_path, "w500") : null;
  const genres = genreNames(item?.genre_ids, 3);

  return (
    <QuickViewContext.Provider value={{ open }}>
      {children}
      {state && item && (
        <div
          className={`qv${show ? " show" : ""}`}
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="qv-box" role="dialog" aria-modal="true" aria-labelledby="qv-title">
            <button ref={closeBtn} className="qv-x" onClick={() => close()} aria-label="Cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
            <div className="qv-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {art && <img src={art} alt="" />}
            </div>
            <div className="qv-body">
              <h3 id="qv-title">{title}</h3>
              <div className="qv-meta">
                {item.vote_average > 0 && <span className="score">★ {item.vote_average.toFixed(1)}</span>}
                {year && <span>{year}</span>}
                <span>{type === "movie" ? "Película" : "Serie"}</span>
                {genres.length > 0 && <span>{genres.join(", ")}</span>}
              </div>
              <p className="qv-desc">{item.overview || "Sin sinopsis disponible."}</p>
              <div className="qv-actions">
                <Link href={`/watch/${type}/${item.id}`} className="btn btn-primary" onClick={() => close(false)}>
                  <PlayIcon /> Reproducir
                </Link>
                <Link href={`/detail/${type}/${item.id}`} className="btn btn-ghost" onClick={() => close(false)}>
                  Más detalles
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </QuickViewContext.Provider>
  );
}
