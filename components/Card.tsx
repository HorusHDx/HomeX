import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

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
      {item.poster_path ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imgUrl(item.poster_path, "w500")!}
          alt={title}
          loading="lazy"
        />
      ) : (
        <div
          className="skeleton ratio"
          role="img"
          aria-label={title}
          style={{ display: "grid", placeItems: "center", fontSize: "0.8rem" }}
        >
          {title}
        </div>
      )}

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
