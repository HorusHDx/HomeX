import Link from "next/link";
import { TMDBItem, imgUrl } from "@/lib/tmdb";

const FALLBACK_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750'%3E%3Crect fill='%23111b2e' width='500' height='750'/%3E%3Ctext fill='%235d6779' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EHomeX%3C/text%3E%3C/svg%3E";

interface CardProps {
  item: TMDBItem;
  showLabel?: boolean;
  badge?: string;
  href?: string;
  wide?: boolean;
  progress?: number;
}

export default function Card({ item, showLabel = true, badge, href, wide, progress }: CardProps) {
  const type = item.media_type || (item.title ? "movie" : "tv");
  const destination = href || `/detail/${type}/${item.id}`;
  const title = item.title || item.name || "";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);

  return (
    <Link href={destination} className={`card${wide ? " wide" : ""}`} title={title}>
      <div className="poster">
        <img
          src={item.poster_path ? imgUrl(item.poster_path, "w500")! : FALLBACK_POSTER}
          alt={title}
          loading="lazy"
        />
        {badge && <span className="card-badge">{badge}</span>}
        {item.vote_average > 0 && (
          <span className="card-score">{item.vote_average.toFixed(1)}</span>
        )}
        {progress != null && (
          <div className="prog">
            <span style={{ width: `${progress}%` }} />
          </div>
        )}
        <div className="pop">
          <strong>{title}</strong>
          <small>{year}</small>
          <div className="acts">
            <span className="ic">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4v16l13-8z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
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
