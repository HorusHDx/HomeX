import { TMDBItem, imgUrl } from "@/lib/tmdb";
import Link from "next/link";

interface Top10RailProps {
  items: TMDBItem[];
}

export default function Top10Rail({ items }: Top10RailProps) {
  if (!items.length) return null;

  return (
    <section className="rail">
      <div className="rh">
        <h2>Top 10 de la semana</h2>
      </div>
      <div className="top10-track">
        {items.slice(0, 10).map((item, i) => (
          <Link
            key={item.id}
            href={`/detail/${item.media_type || (item.title ? "movie" : "tv")}/${item.id}`}
            className="card top-card"
          >
            <span className="top-num" aria-hidden="true">{i + 1}</span>
            <div className="poster">
              {item.poster_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl(item.poster_path, "w500")!}
                  alt={item.title || item.name || ""}
                  loading="lazy"
                />
              ) : (
                <div className="skeleton ratio" />
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
