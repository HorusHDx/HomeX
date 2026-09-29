import { getDetail, imgUrl, MediaType } from "@/lib/tmdb";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface Props {
  params: { type: MediaType; id: string };
}

export default async function DetailPage({ params }: Props) {
  const detail = await getDetail(params.type, params.id).catch(() => null);
  if (!detail) notFound();

  const title = detail.title || detail.name || "";
  const year = (detail.release_date || detail.first_air_date || "").slice(0, 4);

  return (
    <div className="relative min-h-screen">
      {detail.backdrop_path && (
        <div className="absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgUrl(detail.backdrop_path, "original")!}
            alt={title}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />
        </div>
      )}

      <div className="relative z-10 mx-auto max-w-5xl px-4 pt-28 pb-16">
        <div className="flex flex-col gap-8 md:flex-row">
          {detail.poster_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl(detail.poster_path, "w500")!}
              alt={title}
              className="w-64 rounded-xl shadow-2xl"
            />
          )}
          <div className="flex-1">
            <h1 className="mb-2 text-4xl font-extrabold">{title}</h1>
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-gray-300">
              <span className="text-green-400">★ {detail.vote_average.toFixed(1)}</span>
              {year && <span>{year}</span>}
              {detail.runtime && <span>{detail.runtime} min</span>}
              {detail.number_of_seasons && (
                <span>{detail.number_of_seasons} temporadas</span>
              )}
            </div>
            {detail.genres && (
              <div className="mb-4 flex flex-wrap gap-2">
                {detail.genres.map((g) => (
                  <span
                    key={g.id}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs"
                  >
                    {g.name}
                  </span>
                ))}
              </div>
            )}
            <p className="mb-6 text-gray-300">{detail.overview}</p>
            <Link
              href={`/watch/${params.type}/${params.id}`}
              className="inline-block rounded bg-brand px-8 py-3 font-semibold transition hover:bg-red-700"
            >
              ▶ Reproducir
            </Link>
          </div>
        </div>

        {params.type === "tv" && detail.seasons && detail.seasons.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-2xl font-bold">Temporadas</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
              {detail.seasons
                .filter((s) => s.season_number > 0)
                .map((s) => (
                  <Link
                    key={s.season_number}
                    href={`/watch/tv/${params.id}?season=${s.season_number}`}
                    className="rounded-lg bg-surface-light p-4 transition hover:bg-white/10"
                  >
                    <p className="font-semibold">{s.name}</p>
                    <p className="text-sm text-gray-400">
                      {s.episode_count} episodios
                    </p>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
