import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface CardProps {
  item: TMDBItem;
  showLabel?: boolean;
  badge?: string;
  href?: string;
  variant?: "poster" | "top";
  rank?: number;
  index?: number;
}

const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M7 4v16l13-8z" />
  </svg>
);

export default function Card({ item, badge, href, variant = "poster", rank, index = 0 }: CardProps) {
  const type = item.media_type || (item.title ? "movie" : "tv");
  const destination = href || `/detail/${type}/${item.id}`;
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const kind = type === "movie" ? "Película" : "Serie";
  const scoreCls = item.vote_average >= 7 ? "tile-score good" : item.vote_average >= 5.5 ? "tile-score mid" : "tile-score";

  return (
    <Link
      href={destination}
      className={`tile${variant === "top" ? " top" : ""}`}
      title={title}
      style={{ "--i": Math.min(index, 12) } as React.CSSProperties}
    >
      {variant === "top" && rank != null && (
        <span className="tile-num" aria-hidden="true">{rank}</span>
      )}
      <div className="poster">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.poster_path ? imgUrl(item.poster_path, "w500")! : FALLBACK_POSTER}
          alt={title}
          loading="lazy"
          decoding="async"
        />
        {badge && <span className="tile-badge">{badge}</span>}
        {variant !== "top" && item.vote_average > 0 && (
          <span className={scoreCls}>{item.vote_average.toFixed(1)}</span>
        )}
        <div className="pop">
          <strong>{title}</strong>
          <small>{[year, kind].filter(Boolean).join(", ")}</small>
          <span className="pop-play" aria-hidden="true"><PlayIcon /></span>
        </div>
      </div>
      {variant !== "top" && <div className="tile-cap">{title}</div>}
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="skeleton ratio" aria-hidden="true" />;
}
