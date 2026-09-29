import { TMDBItem, imgUrl } from "@/lib/tmdb";
import Link from "next/link";

interface ContentRowProps {
  title: string;
  items: TMDBItem[];
}

export default function ContentRow({ title, items }: ContentRowProps) {
  if (!items?.length) return null;

  return (
    <section className="px-4 md:px-8">
      <h2 className="mb-4 text-xl font-bold md:text-2xl">{title}</h2>
      <div className="hide-scrollbar flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
          const type = item.media_type || (item.title ? "movie" : "tv");
          return (
            <Link
              key={`${type}-${item.id}`}
              href={`/detail/${type}/${item.id}`}
              className="group w-36 flex-shrink-0 md:w-44"
            >
              <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-surface-light">
                {item.poster_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imgUrl(item.poster_path, "w500")!}
                    alt={item.title || item.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-600">
                    Sin imagen
                  </div>
                )}
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/80 to-transparent opacity-0 transition group-hover:opacity-100">
                  <div className="p-2">
                    <p className="text-sm font-semibold">{item.title || item.name}</p>
                    <p className="text-xs text-gray-300">
                      ★ {item.vote_average.toFixed(1)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
