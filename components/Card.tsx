import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";
import PosterImg from "./PosterImg";

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
        <PosterImg
          src={item.poster_path ? imgUrl(item.poster_path, "w342")! : null}
          sizes="(max-width: 640px) 40vw, 186px"
          alt={title}
          eager={index < 4}
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
