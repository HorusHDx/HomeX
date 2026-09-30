import Link from "next/link";
import {
  getAnime2RecentEpisodes,
  getAnime2RecentAdded,
  getAnime2Popular,
  getAnime2ByGenre,
} from "@/lib/animeav1";
import PosterImg from "@/components/PosterImg";
import Anime2Search from "./Anime2Search";
import Anime2Rail from "./Anime2Rail";
import Anime2ContinueWatching from "@/components/Anime2ContinueWatching";

export const revalidate = 1800;

const EMPTY: { slug: string; title: string; cover: string | null }[] = [];

export default async function Anime2Page() {
  const [recentEps, recentAdded, popular, accion, comedia] = await Promise.all([
    getAnime2RecentEpisodes().catch(() => []),
    getAnime2RecentAdded().catch(() => EMPTY),
    getAnime2Popular().catch(() => EMPTY),
    getAnime2ByGenre("accion").catch(() => EMPTY),
    getAnime2ByGenre("comedia").catch(() => EMPTY),
  ]);

  return (
    <div className="page">
      <h1 className="section-title">Anime2</h1>

      <div style={{ marginTop: "1.4rem" }}>
        <Anime2Search />
      </div>

      <Anime2ContinueWatching />

      {recentEps.length > 0 && (
        <Anime2Rail title="Episodios recientes" hint="Últimas actualizaciones">
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
        </Anime2Rail>
      )}

      {popular.length > 0 && (
        <Anime2Rail title="Populares" hint="Lo más visto">
          {popular.slice(0, 20).map((item, i) => (
            <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
              <div className="poster">
                <PosterImg src={item.cover} alt={item.title} eager={i < 4} />
              </div>
              <span className="card-label">{item.title}</span>
            </Link>
          ))}
        </Anime2Rail>
      )}

      {accion.length > 0 && (
        <Anime2Rail title="Acción" hint="Anime de acción">
          {accion.slice(0, 20).map((item) => (
            <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
              <div className="poster">
                <PosterImg src={item.cover} alt={item.title} />
              </div>
              <span className="card-label">{item.title}</span>
            </Link>
          ))}
        </Anime2Rail>
      )}

      {comedia.length > 0 && (
        <Anime2Rail title="Comedia" hint="Para reír">
          {comedia.slice(0, 20).map((item) => (
            <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
              <div className="poster">
                <PosterImg src={item.cover} alt={item.title} />
              </div>
              <span className="card-label">{item.title}</span>
            </Link>
          ))}
        </Anime2Rail>
      )}

      {recentAdded.length > 0 && (
        <Anime2Rail title="Recién agregados" hint="Novedades del catálogo">
          {recentAdded.map((item) => (
            <Link key={item.slug} href={`/anime2/${item.slug}`} className="card">
              <div className="poster">
                <PosterImg src={item.cover} alt={item.title} />
              </div>
              <span className="card-label">{item.title}</span>
            </Link>
          ))}
        </Anime2Rail>
      )}
    </div>
  );
}
