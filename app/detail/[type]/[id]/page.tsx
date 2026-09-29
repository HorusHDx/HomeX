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
        <div className="title-backdrop">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imgUrl(detail.backdrop_path, "original")!} alt={title} />
        </div>
      )}

      <div className="title-content">
        <div className="title-grid">
          {detail.poster_path && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imgUrl(detail.poster_path, "w500")!}
              alt={title}
              className="title-poster"
            />
          )}
          <div className="title-info">
            <h1>{title}</h1>
            <div className="title-meta">
              <span className="score">★ {detail.vote_average.toFixed(1)}</span>
              {year && <span>{year}</span>}
              {detail.runtime && <span>{detail.runtime} min</span>}
              {detail.number_of_seasons && (
                <span>{detail.number_of_seasons} temporadas</span>
              )}
            </div>
            {detail.genres && (
              <div className="title-genres">
                {detail.genres.map((g) => (
                  <span key={g.id}>{g.name}</span>
                ))}
              </div>
            )}
            <p className="title-overview">{detail.overview}</p>
            <div className="title-actions">
              <Link
                href={`/watch/${params.type}/${params.id}`}
                className="btn btn-primary"
              >
                ▶ Reproducir
              </Link>
            </div>
          </div>
        </div>

        {params.type === "tv" && detail.seasons && detail.seasons.length > 0 && (
          <div className="mt-12">
            <h2 className="section-title">Temporadas</h2>
            <div className="season-tabs">
              {detail.seasons
                .filter((s) => s.season_number > 0)
                .map((s) => (
                  <Link
                    key={s.season_number}
                    href={`/watch/tv/${params.id}?season=${s.season_number}`}
                    className="season-tab"
                  >
                    {s.name}
                  </Link>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
