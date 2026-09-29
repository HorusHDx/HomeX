import Link from "next/link";
import { imgUrl } from "@/lib/tmdb";

interface HeroProps {
  title: string;
  overview: string;
  backdrop: string;
  id: number;
  mediaType: "movie" | "tv";
}

export default function Hero({ title, overview, backdrop, id, mediaType }: HeroProps) {
  return (
    <div className="relative h-[70vh] min-h-[500px]">
      {backdrop && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(backdrop, "original")!}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/40 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-surface/80 to-transparent" />

      <div className="absolute bottom-24 left-4 max-w-2xl md:left-8">
        <h1 className="mb-4 text-4xl font-extrabold md:text-6xl">{title}</h1>
        <p className="mb-6 line-clamp-3 text-lg text-gray-300">{overview}</p>
        <div className="flex gap-3">
          <Link
            href={`/watch/${mediaType}/${id}`}
            className="rounded bg-white px-6 py-2.5 font-semibold text-black transition hover:bg-white/80"
          >
            ▶ Reproducir
          </Link>
          <Link
            href={`/detail/${mediaType}/${id}`}
            className="rounded bg-white/20 px-6 py-2.5 font-semibold backdrop-blur transition hover:bg-white/30"
          >
            Más info
          </Link>
        </div>
      </div>
    </div>
  );
}
