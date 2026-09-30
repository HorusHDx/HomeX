// Cliente: usa el proxy /api/tmdb para no exponer TMDB_API_KEY
import type { TMDBDetail, TMDBEpisode } from "./tmdb";

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const getDetailClient = (type: "movie" | "tv", id: string | number) =>
  getJSON<TMDBDetail>(`/api/tmdb/${type}/${id}?append_to_response=credits%2Cvideos`);

export const getSeasonClient = (id: string | number, season: number) =>
  getJSON<{ episodes: TMDBEpisode[] }>(`/api/tmdb/tv/${id}/season/${season}`);
