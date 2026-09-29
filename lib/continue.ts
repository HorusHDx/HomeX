const KEY = "homex:continue:v1";
const LIMIT = 12;

export interface ContinueEntry {
  id: number;
  title: string;
  poster: string | null;
  season: number;
  episode: number;
  at: number;
}

function read(): ContinueEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list: unknown = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    return list.filter(
      (e): e is ContinueEntry =>
        typeof e === "object" &&
        e !== null &&
        Number.isInteger((e as ContinueEntry).id) &&
        Number.isInteger((e as ContinueEntry).season) &&
        Number.isInteger((e as ContinueEntry).episode) &&
        typeof (e as ContinueEntry).title === "string"
    );
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
  if (show.media !== "tv") return;

  const entry: ContinueEntry = {
    id: show.id,
    title: show.title,
    poster: show.poster,
    season,
    episode,
    at: Date.now(),
  };

  const rest = read().filter((e) => e.id !== show.id);
  write([entry, ...rest]);
}

export function clearContinue(id: number): void {
  write(read().filter((e) => e.id !== id));
}
