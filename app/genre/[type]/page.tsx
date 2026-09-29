import { getPopular, getTopRated, MediaType } from "@/lib/tmdb";
import ContentRow from "@/components/ContentRow";

export const dynamic = "force-dynamic";

const TITLES: Record<MediaType, string> = {
  movie: "Películas",
  tv: "Series",
};

export default async function GenrePage({ params }: { params: { type: MediaType } }) {
  const [popular, topRated] = await Promise.all([
    getPopular(params.type),
    getTopRated(params.type),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pt-28 pb-16">
      <h1 className="mb-8 text-3xl font-bold">{TITLES[params.type]}</h1>
      <div className="space-y-10">
        <ContentRow title="Populares" items={popular.results} />
        <ContentRow title="Mejor valoradas" items={topRated.results} />
      </div>
    </div>
  );
}
