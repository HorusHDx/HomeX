import { getTrending, getPopular, getTopRated } from "@/lib/tmdb";
import HeroCarousel from "@/components/HeroCarousel";
import Rail from "@/components/Rail";
import ContinueWatching from "@/components/ContinueWatching";
import Top10Rail from "@/components/Top10Rail";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trending, popularMovies, topMovies, popularTv, topTv] = await Promise.all([
    getTrending("all"),
    getPopular("movie"),
    getTopRated("movie"),
    getPopular("tv"),
    getTopRated("tv"),
  ]);

  return (
    <div>
      <HeroCarousel items={trending.results} />
      <div className="rails">
        <ContinueWatching />
        <Top10Rail items={trending.results} />
        <Rail title="Películas populares" items={popularMovies.results} />
        <Rail title="Series populares" items={popularTv.results} />
        <Rail title="Películas mejor valoradas" items={topMovies.results} />
        <Rail title="Series mejor valoradas" items={topTv.results} />
      </div>
    </div>
  );
}
