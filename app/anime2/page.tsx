import Link from "next/link";
import { getAnime2RecentEpisodes, getAnime2RecentAdded, getAnime2Popular } from "@/lib/animeav1";
import PosterImg from "@/components/PosterImg";
import Anime2Search from "./Anime2Search";

export const revalidate = 1800;

const EMPTY: { slug: string; title: string; cover: string | null }[] = [];

export default async function Anime2Page() {
  const [recentEps, recentAdded, popular] = await Promise.all([
    getAnime2RecentEpisodes().catch(() => []),
    getAnime2RecentAdded().catch(() => EMPTY),
    getAnime2Popular().catch(() => EMPTY),
  ]);

  return (
    <div className="page">
      <h1 className="section-title">Anime2</h1>

      <div style={{ marginTop: "1.4rem" }}>
        <Anime2Search />
      </div>

      {recentEps.length > 0 && (
        <section className="rail">
          <div className="rail-head">
            <h2>Episodios recientes</h2>
            <span>Últimas actualizaciones</span>
          </div>
          <div className="rail-track">
            {recentEps.map((ep, i) => (
              <Link
                key={`${ep.slug}-${ep.episode}`}
                href={`/anime2/${ep.slug}/${ep.episode}`}
                className="card"
                style={{ width: "clamp(200px, 20vw, 280px)" }}
              >
                <div className="poster landscape">
                  <PosterImg src={ep.cover} alt={ep.title} eager={i < 4} />
                </div>
                <span className="card-badge">E{ep.episode}</span>
                <span className="card-label show">
                  {ep.title}
                  {ep.time && <small>{ep.time}</small>}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {popular.length > 0 && (
        <section className="rail">
          <div className="rail-head">
            <h2>Populares</h2>
            <span>Lo más visto</span>
          </div>
          <div className="rail-track">
            {popular.slice(0, 20).map((item, i) => (
              <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
                <div className="poster">
                  <PosterImg src={item.cover} alt={item.title} eager={i < 4} />
                </div>
                <span className="card-label">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {recentAdded.length > 0 && (
        <section className="rail">
          <div className="rail-head">
            <h2>Recién agregados</h2>
            <span>Novedades del catálogo</span>
          </div>
          <div className="rail-track">
            {recentAdded.map((item, i) => (
              <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
                <div className="poster">
                  <PosterImg src={item.cover} alt={item.title} />
                </div>
                <span className="card-label">{item.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
