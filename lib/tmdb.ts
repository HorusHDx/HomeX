const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_BASE = "https://image.tmdb.org/t/p";

export type MediaType = "movie" | "tv";

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids: number[];
  media_type?: MediaType;
}

export interface TMDBResponse {
  page: number;
  results: TMDBItem[];
  total_pages: number;
  total_results: number;
}

export interface TMDBDetail extends TMDBItem {
  genres?: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: {
    season_number: number;
    name: string;
    episode_count: number;
    air_date: string;
  }[];
}

export interface TMDBEpisode {
  id: number;
  name: string;
  overview: string;
  episode_number: number;
  season_number: number;
  still_path: string | null;
  air_date: string;
}

const fetchTMDB = async <T>(path: string, params: Record<string, string> = {}): Promise<T> => {
  if (!API_KEY) throw new Error("TMDB_API_KEY no configurada");
  // Solo servidor: evita llamar TMDB directo desde el cliente (expondría la key)
  if (typeof window !== "undefined") {
    throw new Error("Usa /api/tmdb desde el cliente");
  }
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "es-ES");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
};

export const getTrending = (type: "all" | MediaType = "all") =>
  fetchTMDB<TMDBResponse>(`/trending/${type}/week`);

export const getPopular = (type: MediaType) =>
  fetchTMDB<TMDBResponse>(`/${type}/popular`);

export const getTopRated = (type: MediaType) =>
  fetchTMDB<TMDBResponse>(`/${type}/top_rated`);

export const getUpcoming = () =>
  fetchTMDB<TMDBResponse>(`/movie/upcoming`);

export const getDetail = (type: MediaType, id: number | string) =>
  fetchTMDB<TMDBDetail>(`/${type}/${id}`, { append_to_response: "credits,videos" });

export const getSeason = (id: number | string, season: number) =>
  fetchTMDB<{ episodes: TMDBEpisode[] }>(`/tv/${id}/season/${season}`);

export const searchTMDB = (query: string, type: "multi" | MediaType = "multi") =>
  fetchTMDB<TMDBResponse>(`/search/${type}`, { query });

export const getGenres = async (type: MediaType) => {
  const data = await fetchTMDB<{ genres: { id: number; name: string }[] }>(`/genre/${type}/list`);
  return data.genres;
};

export const getRecommendations = (type: MediaType, id: number | string) =>
  fetchTMDB<TMDBResponse>(`/${type}/${id}/recommendations`);

export const discover = (type: MediaType, params: Record<string, string> = {}) =>
  fetchTMDB<TMDBResponse>(`/discover/${type}`, params);

// Anime: animación japonesa (género 16 + idioma original ja)
export const getAnime = (type: MediaType, sort = "popularity.desc") =>
  discover(type, {
    with_genres: "16",
    with_original_language: "ja",
    sort_by: sort,
    ...(sort.startsWith("vote_average") ? { "vote_count.gte": "200" } : {}),
  });

export const imgUrl = (path: string | null, size: "w342" | "w500" | "original" | "w780" = "w500") =>
  path ? `${IMG_BASE}/${size}${path}` : null;
