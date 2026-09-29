import { getTrending, getPopular, getTopRated } from "@/lib/tmdb";
import Hero from "@/components/Hero";
import ContentRow from "@/components/ContentRow";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [trending, popularMovies, topMovies, popularTv, topTv] = await Promise.all([
    getTrending("all"),
    getPopular("movie"),
    getTopRated("movie"),
    getPopular("tv"),
    getTopRated("tv"),
  ]);

  const heroItem =
    trending.results.find((i) => i.backdrop_path) || trending.results[0];

  return (
    <div>
      <Hero
        title={heroItem?.title || heroItem?.name || "HomeX"}
        overview={heroItem?.overview || ""}
        backdrop={heroItem?.backdrop_path || ""}
        id={heroItem?.id || 0}
        mediaType={heroItem?.title ? "movie" : "tv"}
      />
      <div className="relative z-10 -mt-32 space-y-10 pb-20">
        <ContentRow title="Tendencias de la semana" items={trending.results} />
        <ContentRow title="Películas populares" items={popularMovies.results} />
        <ContentRow title="Series populares" items={popularTv.results} />
        <ContentRow title="Películas mejor valoradas" items={topMovies.results} />
        <ContentRow title="Series mejor valoradas" items={topTv.results} />
      </div>
    </div>
  );
}
