import { getAnime } from "@/lib/tmdb";
import Rail from "@/components/Rail";

export const revalidate = 3600;

const EMPTY = { page: 1, results: [], total_pages: 0, total_results: 0 };

export default async function AnimePage() {
  const [moviesPop, tvPop, moviesTop, tvTop] = await Promise.all([
    getAnime("movie").catch(() => EMPTY),
    getAnime("tv").catch(() => EMPTY),
    getAnime("movie", "vote_average.desc").catch(() => EMPTY),
    getAnime("tv", "vote_average.desc").catch(() => EMPTY),
  ]);

  return (
    <div className="page">
      <h1 className="section-title">Anime</h1>
      <p className="section-sub">Animación japonesa: películas y series</p>
      <div className="rails">
        <Rail title="Películas anime populares" items={moviesPop.results} />
        <Rail title="Series anime populares" items={tvPop.results} />
        <Rail title="Películas anime mejor valoradas" items={moviesTop.results} />
        <Rail title="Series anime mejor valoradas" items={tvTop.results} />
      </div>
    </div>
  );
}
