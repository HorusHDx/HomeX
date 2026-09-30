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

// ---------- Anime2 (segundo servidor, clave separada) ----------

const KEY_A2 = "homex:continue:anime2:v1";

export interface Anime2Entry {
  slug: string;
  title: string;
  cover: string | null;
  episode: number;
  at: number;
}

function readA2(): Anime2Entry[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(KEY_A2);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is Anime2Entry =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Anime2Entry).slug === "string" &&
        typeof (e as Anime2Entry).title === "string" &&
        Number.isInteger((e as Anime2Entry).episode)
    );
  } catch {
    return [];
  }
}

function writeA2(list: Anime2Entry[]): void {
  try {
    localStorage.setItem(KEY_A2, JSON.stringify(list.slice(0, LIMIT)));
  } catch {}
}

export function getAnime2Continue(): Anime2Entry[] {
  return readA2().sort((a, b) => b.at - a.at);
}

export function markAnime2Watched(
  show: { slug: string; title: string; cover: string | null },
  episode: number
): void {
  if (!show.slug || !show.title || !Number.isInteger(episode)) return;
  const entry: Anime2Entry = {
    slug: show.slug,
    title: show.title,
    cover: show.cover,
    episode,
    at: Date.now(),
  };
  const rest = readA2().filter((e) => e.slug !== show.slug);
  writeA2([entry, ...rest]);
}

export function clearAnime2Continue(slug?: string): void {
  if (!slug) {
    try {
      localStorage.removeItem(KEY_A2);
    } catch {}
    return;
  }
  writeA2(readA2().filter((e) => e.slug !== slug));
}
