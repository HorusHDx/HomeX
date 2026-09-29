import Card, { CardSkeleton } from "./Card";
import { TMDBItem } from "@/lib/tmdb";

interface RailProps {
  title: string;
  hint?: string;
  items?: TMDBItem[];
  loading?: boolean;
  count?: number;
  badges?: (string | null)[];
  links?: (string | null)[];
}

export default function Rail({
  title,
  hint,
  items,
  loading = false,
  count = 8,
  badges,
  links,
}: RailProps) {
  const list = items ?? [];

  return (
    <section className="rail">
      <div className="rail-head">
        <h2>{title}</h2>
        {hint && <span>{hint}</span>}
      </div>

      <div className="rail-track">
        {loading && !list.length
          ? Array.from({ length: count }, (_, i) => <CardSkeleton key={i} />)
          : list.map((item, i) => {
              const type = item.media_type || (item.title ? "movie" : "tv");
              return (
                <Card
                  key={`${type}-${item.id}`}
                  item={item}
                  badge={badges?.[i] ?? undefined}
                  href={links?.[i] ?? undefined}
                />
              );
            })}
      </div>
    </section>
  );
}
