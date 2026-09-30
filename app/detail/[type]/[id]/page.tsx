import { getDetail, getRecommendations, imgUrl, type MediaType } from "@/lib/tmdb";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SeasonClient from "./SeasonClient";
import Card from "@/components/Card";

export const revalidate = 3600;

interface Props {
  params: { type: MediaType; id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (params.type !== "movie" && params.type !== "tv") return { title: "No encontrado" };
  const detail = await getDetail(params.type, params.id).catch(() => null);
  if (!detail) return { title: "No encontrado" };
  const title = detail.title || detail.name || "Detalle";
  return {
    title: `${title} | HomeX`,
    description: detail.overview?.slice(0, 160) || "Ver online en HomeX",
  };
}

export default async function DetailPage({ params }: Props) {
  if (params.type !== "movie" && params.type !== "tv") notFound();

  const detail = await getDetail(params.type, params.id).catch(() => null);
  if (!detail || typeof detail.vote_average !== "number" || (!detail.title && !detail.name)) notFound();

  const title = detail.title || detail.name || "";
  const year = (detail.release_date || detail.first_air_date || "").slice(0, 4);

  const recommendations = await getRecommendations(params.type, params.id).catch(() => null);
  const similarItems = recommendations?.results?.slice(0, 12) || [];

  return (
    <div className="relative min-h-screen">
      {detail.backdrop_path && (
        <div className="title-backdrop">
          <Image
            src={imgUrl(detail.backdrop_path, "w1280")!}
            alt=""
            aria-hidden="true"
            fill
            sizes="100vw"
            priority
            style={{ objectFit: "cover" }}
          />
        </div>
      )}

      <div className="title-content">
        <div className="title-grid">
          {detail.poster_path && (
            <Image
              src={imgUrl(detail.poster_path, "w500")!}
              alt={title}
              className="title-poster"
              width={500}
              height={750}
              priority
            />
          )}
          <div className="title-info">
            <h1>{title}</h1>
            <div className="title-meta">
              <span className="score">★ {detail.vote_average.toFixed(1)}</span>
              {year && <span>{year}</span>}
              {detail.runtime ? <span>{detail.runtime} min</span> : null}
              {detail.number_of_seasons ? (
                <span>{detail.number_of_seasons} temporadas</span>
              ) : null}
            </div>
            {detail.genres && (
              <div className="title-genres">
                {detail.genres.map((g) => (
                  <span key={g.id}>{g.name}</span>
                ))}
              </div>
            )}
            <p className="title-overview">{detail.overview || "Sin sinopsis disponible."}</p>
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
            <h2 className="section-title">Episodios</h2>
            <SeasonClient
              tvId={params.id}
              seasons={detail.seasons.filter((s) => s.season_number > 0)}
            />
          </div>
        )}

        {similarItems.length > 0 && (
          <div className="mt-12">
            <h2 className="section-title">También te puede gustar</h2>
            <div className="grid">
              {similarItems.map((item) => (
                <Card
                  key={`${item.media_type || params.type}-${item.id}`}
                  item={{ ...item, media_type: item.media_type || params.type }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
