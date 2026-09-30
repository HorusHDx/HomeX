"use client";

import { useState } from "react";

export const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface Props {
  src: string | null;
  alt: string;
  eager?: boolean;
  className?: string;
}

/** Imagen de póster con fallback ante error y fundido al cargar. */
export default function PosterImg({ src, alt, eager = false, className }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const showFallback = failed || !src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={showFallback ? FALLBACK_POSTER : src}
      alt={alt}
      loading={showFallback || eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      className={className}
      style={{ opacity: loaded || showFallback ? 1 : 0 }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
