import { getPopular, getTopRated, type MediaType } from "@/lib/tmdb";
import Rail from "@/components/Rail";
import { notFound } from "next/navigation";

export const revalidate = 3600;

const TITLES: Record<MediaType, string> = {
  movie: "Películas",
  tv: "Series",
};

const EMPTY = { page: 1, results: [], total_pages: 0, total_results: 0 };

export default async function GenrePage({ params }: { params: { type: MediaType } }) {
  if (params.type !== "movie" && params.type !== "tv") notFound();

  const [popular, topRated] = await Promise.all([
    getPopular(params.type).catch(() => EMPTY),
    getTopRated(params.type).catch(() => EMPTY),
  ]);

  return (
    <div className="page">
      <h1 className="section-title">{TITLES[params.type]}</h1>
      <p className="section-sub">Catálogo completo</p>
      <div className="rails">
        <Rail title="Populares" items={popular.results} />
        <Rail title="Mejor valoradas" items={topRated.results} />
      </div>
    </div>
  );
}
