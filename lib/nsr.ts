// NSR Play — cliente servidor (la API Key nunca sale del servidor).
// Docs: /embed/sources -> servidores con token de un solo uso (5 min)
//       /embed/resolve -> playUrl (proxy con Referer/UA correctos, CORS *)
// El directUrl viene firmado a la IP de NSR: desde el navegador da 403,
// por eso solo usamos playUrl.

const NSR_BASE = "https://nsrplay.space/api/v1";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const TIMEOUT = 8000;

export interface NsrServer {
  index: number;
  name: string;
  provider: string;
  lang: "latino" | "castellano" | "subtitulado" | "original";
  label: string;
}

export interface NsrStream {
  url: string;
  format: "hls" | "mp4";
}

interface RawServer {
  name?: string;
  server?: string;
  language?: string;
  token?: string;
  playUrl?: string;
  directUrl?: string;
  isDirectStream?: boolean;
}

function apiKey(): string {
  return process.env.NSR_API_KEY || "";
}

function headers(): HeadersInit {
  const h: Record<string, string> = {
    "User-Agent": UA,
    Referer: "https://nsrplay.space/",
    Accept: "application/json",
  };
  const key = apiKey();
  if (key) h["X-API-Key"] = key;
  return h;
}

async function apiGet<T>(path: string): Promise<T | null> {
  if (!apiKey()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const res = await fetch(`${NSR_BASE}${path}`, {
      headers: headers(),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { success?: boolean } & T;
    if (json.success === false) return null;
    return json as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// --- idioma ---------------------------------------------------------------

const LANG_RANK: Record<NsrServer["lang"], number> = {
  latino: 0,
  castellano: 1,
  subtitulado: 2,
  original: 3,
};

export function normalizeNsrLang(lang: string): NsrServer["lang"] {
  const l = lang.toLowerCase().trim();
  if (!l) return "original";
  if (l === "lat" || l.includes("latino") || l.includes("latam")) return "latino";
  if (l.includes("castellano") || l.includes("espa")) return "castellano";
  if (l.includes("sub")) return "subtitulado";
  return "original";
}

function providerName(s: RawServer): string {
  const p = (s.server || "").trim();
  if (p) return p;
  const n = (s.name || "").trim();
  return n && n.toLowerCase() !== "nsr play" ? n : "NSR Play";
}

// --- sources --------------------------------------------------------------

function sourcesPath(type: "movie" | "tv", id: string, season: number, episode: number): string {
  return type === "movie"
    ? `/embed/sources/movie/${id}?fast=true`
    : `/embed/sources/tv/${id}/${season}/${episode}?fast=true`;
}

export interface NsrTarget {
  type: "movie" | "tv";
  id: string;
  season: number;
  episode: number;
}

export function parseNsrTarget(params: URLSearchParams): NsrTarget | null {
  const type = params.get("type");
  const id = params.get("id") || "";
  if ((type !== "movie" && type !== "tv") || !/^\d+$/.test(id)) return null;
  const season = Math.max(1, parseInt(params.get("season") || "1", 10) || 1);
  const episode = Math.max(1, parseInt(params.get("episode") || "1", 10) || 1);
  return { type, id, season, episode };
}

// Caché corta: los tokens viven 5 min, pero el usuario normalmente elige
// servidor en segundos. Evita gastar cuota al saltar de un estado a otro.
const CACHE_TTL = 60 * 1000;
const CACHE_MAX = 100;
const cache = new Map<string, { at: number; servers: RawServer[] }>();

function targetKey(t: NsrTarget): string {
  return `${t.type}/${t.id}/${t.season}/${t.episode}`;
}

// Devuelve los servidores YA ordenados y deduplicados. El orden es estable
// dentro de la ventana de caché, así que el índice que ve el usuario siempre
// apunta al mismo token del array crudo.
async function orderedRawServers(t: NsrTarget): Promise<RawServer[] | null> {
  const key = targetKey(t);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.servers;
  if (hit) cache.delete(key);

  const data = await apiGet<{ servers?: RawServer[] }>(sourcesPath(t.type, t.id, t.season, t.episode));
  if (!data || !Array.isArray(data.servers)) return null;

  const usable = data.servers.filter((s) => typeof s?.token === "string" && s.token.length > 0);

  const seen = new Set<string>();
  const ordered = usable
    .map((s) => ({ s, lang: normalizeNsrLang(s.language || ""), provider: providerName(s) }))
    .sort((a, b) => LANG_RANK[a.lang] - LANG_RANK[b.lang] || a.provider.localeCompare(b.provider))
    .filter((entry) => {
      const k = `${entry.provider}|${entry.lang}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .map((entry) => entry.s);

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), servers: ordered });
  return ordered;
}

export async function getNsrServers(t: NsrTarget): Promise<NsrServer[]> {
  const ordered = await orderedRawServers(t);
  if (!ordered) return [];
  return ordered.map((s, index) => ({
    index,
    name: providerName(s),
    provider: providerName(s),
    lang: normalizeNsrLang(s.language || ""),
    label: s.language || "",
  }));
}

// --- resolve --------------------------------------------------------------

export async function resolveNsrStream(t: NsrTarget, index: number): Promise<NsrStream | null> {
  const ordered = await orderedRawServers(t);
  const server = ordered?.[index];
  if (!server?.token) return null;

  // Algunos servidores ya traen el proxy listo: nos ahorra el resolve.
  if (server.playUrl) return { url: server.playUrl, format: "hls" };

  const data = await apiGet<{ data?: { playUrl?: string; directUrl?: string } }>(
    `/embed/resolve?token=${encodeURIComponent(server.token)}`
  );
  const url = data?.data?.playUrl;
  if (!url) return null;
  return { url, format: /\.mp4(\?|$)/i.test(url) ? "mp4" : "hls" };
}
