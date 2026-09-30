const KEY = "homex:continue:v1";
const LIMIT = 12;

export interface ContinueEntry {
  id: number;
  media: "movie" | "tv";
  title: string;
  poster: string | null;
  season: number;
  episode: number;
  at: number;
}

function read(): ContinueEntry[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is ContinueEntry =>
        typeof e === "object" &&
        e !== null &&
        Number.isInteger((e as ContinueEntry).id) &&
        typeof (e as ContinueEntry).title === "string"
    ).map((e) => ({
      ...e,
      media: (e as ContinueEntry).media === "movie" ? ("movie" as const) : ("tv" as const),
      season: Number.isInteger(e.season) ? e.season : 1,
      episode: Number.isInteger(e.episode) ? e.episode : 1,
    } as ContinueEntry));
  } catch {
    return [];
  }
}

function write(list: ContinueEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {}
}

export function getContinue(): ContinueEntry[] {
  return read().sort((a, b) => b.at - a.at);
}

export function markWatched(
  show: { id: number; media: string; title: string; poster: string | null },
  season: number,
  episode: number
): void {
  if (!show.title) return;
  const media = show.media === "movie" ? "movie" : "tv";

  const entry: ContinueEntry = {
    id: show.id,
    media,
    title: show.title,
    poster: show.poster,
    season: media === "movie" ? 1 : season,
    episode: media === "movie" ? 1 : episode,
    at: Date.now(),
  };

  const rest = read().filter((e) => !(e.id === show.id && e.media === media));
  write([entry, ...rest]);
}

export function clearContinue(id: number, media?: string): void {
  const list = read();
  write(
    media
      ? list.filter((e) => !(e.id === id && (e as ContinueEntry).media === media))
      : list.filter((e) => e.id !== id)
  );
}
