import { getTrending, getPopular, getTopRated } from "@/lib/tmdb";
import HeroCarousel from "@/components/HeroCarousel";
import Rail from "@/components/Rail";
import ContinueWatching from "@/components/ContinueWatching";

export const revalidate = 3600;

async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch {
    return fallback;
  }
}

const EMPTY = { page: 1, results: [], total_pages: 0, total_results: 0 };

export default async function HomePage() {
  const [trending, popularMovies, topMovies, popularTv, topTv] = await Promise.all([
    safe(getTrending("all"), EMPTY),
    safe(getPopular("movie"), EMPTY),
    safe(getTopRated("movie"), EMPTY),
    safe(getPopular("tv"), EMPTY),
    safe(getTopRated("tv"), EMPTY),
  ]);

  // trending/all puede traer personas: solo movie/tv
  const trendingClean = {
    ...trending,
    results: trending.results.filter(
      (i) => (i.media_type as string) !== "person" && (i.title || i.name)
    ),
  };

  return (
    <div>
      <HeroCarousel items={trendingClean.results} />
      <div className="rails">
        <ContinueWatching />
        <Rail title="Top 10 de la semana" variant="top" items={trendingClean.results} />
        <Rail title="Películas populares" items={popularMovies.results} />
        <Rail title="Series populares" items={popularTv.results} />
        <Rail title="Películas mejor valoradas" items={topMovies.results} />
        <Rail title="Series mejor valoradas" items={topTv.results} />
      </div>
    </div>
  );
}
