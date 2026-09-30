import Link from "next/link";
import { notFound } from "next/navigation";
import { getAnime2Info } from "@/lib/animeav1";
import PosterImg from "@/components/PosterImg";

export const revalidate = 3600;

interface Props {
  params: { slug: string };
}

export default async function Anime2DetailPage({ params }: Props) {
  if (!/^[a-z0-9-]{2,120}$/.test(params.slug)) notFound();
  const info = await getAnime2Info(params.slug).catch(() => null);
  if (!info) notFound();

  return (
    <div className="page">
      <Link href="/anime2" className="watch-back" style={{ marginBottom: "1rem", display: "inline-flex" }}>
        ← Anime2
      </Link>
      <div className="title-grid" style={{ marginTop: "1rem" }}>
        {info.cover && (
          <div style={{ width: 220, flexShrink: 0 }}>
            <div className="poster">
              <PosterImg src={info.cover} alt={info.title} eager />
            </div>
          </div>
        )}
        <div className="title-info">
          <h1>{info.title}</h1>
          <div className="title-meta">
            {info.status && (
              <span className={`status-pill${/emisi/i.test(info.status) ? " live" : ""}`}>
                {/emisi/i.test(info.status) && <span className="live-dot" aria-hidden="true" />}
                {info.status}
              </span>
            )}
            {info.kind && <span>{info.kind}</span>}
            {info.year && <span>{info.year}</span>}
            {info.season && <span>{info.season}</span>}
            {info.rating && <span className="score">★ {info.rating}</span>}
            {info.episodesCount > 0 && <span>{info.episodesCount} episodios</span>}
          </div>
          {info.genres.length > 0 && (
            <div className="title-genres">
              {info.genres.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
          )}
          {info.synopsis && <p className="title-overview">{info.synopsis}</p>}
        </div>
      </div>

      <div className="mt-12" style={{ marginTop: "2rem" }}>
        <h2 className="section-title">Episodios</h2>
        {info.episodes.length === 0 ? (
          <div className="state">
            <h3>Sin episodios</h3>
            <p>Este título aún no tiene episodios disponibles.</p>
          </div>
        ) : (
          <div className="chips">
            {info.episodes.map((ep) => (
              <Link key={ep} href={`/anime2/${info.slug}/${ep}`} className="chip">
                {ep}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
