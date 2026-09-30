"use client";

import { useEffect, useState } from "react";

export const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface Props {
  src: string | null;
  srcSet?: string;
  sizes?: string;
  alt: string;
  eager?: boolean;
  className?: string;
}

const STALL_TIMEOUT = 10000;

/** Póster con fallback ante error, fundido al cargar y reintento si se queda colgado. */
export default function PosterImg({ src, srcSet, sizes, alt, eager = false, className }: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [retry, setRetry] = useState(0);
  const showFallback = failed || !src;

  // Si la petición se queda colgada (ni load ni error), remontar fuerza reintento
  useEffect(() => {
    if (showFallback || loaded || eager) return;
    const t = setTimeout(() => setRetry((r) => (r < 1 ? r + 1 : r)), STALL_TIMEOUT);
    return () => clearTimeout(t);
  }, [showFallback, loaded, eager, retry]);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={retry}
      src={showFallback ? FALLBACK_POSTER : src}
      srcSet={showFallback ? undefined : srcSet}
      sizes={showFallback ? undefined : sizes}
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
