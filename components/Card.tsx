import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%231c1c25' width='500' height='750'/%3E%3Ctext fill='%236b7180' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface CardProps {
  item: TMDBItem;
  showLabel?: boolean;
  badge?: string;
  href?: string;
}

export default function Card({ item, showLabel = true, badge, href }: CardProps) {
  const type = item.media_type || (item.title ? "movie" : "tv");
  const destination = href || `/detail/${type}/${item.id}`;
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);

  return (
    <Link href={destination} className="card" title={title}>
      <img
        src={item.poster_path ? imgUrl(item.poster_path, "w500")! : FALLBACK_POSTER}
        alt={title}
        loading="lazy"
      />

      {badge && <span className="card-badge">{badge}</span>}

      {item.vote_average > 0 && (
        <span className="card-score">{item.vote_average.toFixed(1)}</span>
      )}

      {showLabel && (
        <span className="card-label">
          {title}
          <small>{year}</small>
        </span>
      )}
    </Link>
  );
}

export function CardSkeleton() {
  return <div className="skeleton ratio" aria-hidden="true" />;
}
