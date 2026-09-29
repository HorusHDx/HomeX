"use client";

import { useEffect, useRef } from "react";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

interface DetailModalProps {
  item: TMDBItem | null;
  onClose: () => void;
  onPlay: (item: TMDBItem) => void;
}

export default function DetailModal({ item, onClose, onPlay }: DetailModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  if (!item) return null;

  const type = item.media_type || (item.title ? "movie" : "tv");
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box" role="dialog" aria-modal="true" aria-label={title}>
        <button
          ref={closeRef}
          className="modal-close"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <div className="modal-hero">
          {item.backdrop_path ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl(item.backdrop_path, "w780")!} alt={title} />
          ) : (
            <div className="skeleton" style={{ width: "100%", aspectRatio: "16/8" }} />
          )}
        </div>
        <div className="modal-body">
          <h3>{title}</h3>
          <div className="modal-meta">
            <span className="score">★ {item.vote_average.toFixed(1)}</span>
            {year && <span>{year}</span>}
            <span>{type === "movie" ? "Película" : "Serie"}</span>
          </div>
          <p className="modal-desc">{item.overview}</p>
          <button className="btn btn-primary" onClick={() => onPlay(item)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 4v16l13-8z" />
            </svg>
            Reproducir
          </button>
        </div>
      </div>
    </div>
  );
}
