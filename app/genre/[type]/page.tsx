import { getPopular, getTopRated, MediaType } from "@/lib/tmdb";
import Rail from "@/components/Rail";

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
