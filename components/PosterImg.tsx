"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export const FALLBACK_POSTER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface Props {
  src: string | null;
  alt: string;
  eager?: boolean;
  sizes?: string;
  className?: string;
}

/**
 * Póster servido por la optimización de imágenes de Next/Vercel
 * (caché en el edge, formato moderno, mismo origen).
 * Debe vivir dentro de un contenedor con posición relativa y tamaño
 * (p. ej. `.poster`). Con fallback ante error y fundido al cargar.
 */
export default function PosterImg({
  src,
  alt,
  eager = false,
  sizes = "(max-width: 640px) 40vw, 186px",
  className,
}: Props) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [src]);

  if (failed || !src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={FALLBACK_POSTER} alt={alt} draggable={false} className={className} />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      priority={eager}
      draggable={false}
      className={className}
      style={{ opacity: loaded ? 1 : 0, objectFit: "cover" }}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
