export interface Anime2Item {
  slug: string;
  title: string;
  cover: string | null;
}

export interface Anime2Info extends Anime2Item {
  synopsis: string;
  genres: string[];
  episodesCount: number;
  episodes: number[];
}

export interface Anime2Server {
  name: string;
  url: string;
  lang: string;
}

const AV1_BASE = "https://animeav1.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FETCH_TIMEOUT = 8000;

async function fetchHtml(path: string): Promise<{ status: number; html: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${AV1_BASE}${path}`, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "es-ES,es;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, html: "" };
    return { status: res.status, html: await res.text() };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(path: string): Promise<{ status: number; json: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`${AV1_BASE}${path}`, {
      headers: {
        "User-Agent": UA,
        "x-sveltekit-data": "true",
        Accept: "*/*",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, json: null };
    return { status: res.status, json: (await res.json()) as unknown };
  } finally {
    clearTimeout(timeout);
  }
}

function clean(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function cleanTitle(raw: string): string {
  return clean(raw)
    .replace(/\s+-\s+AnimeAV1.*$/i, "")
    .replace(/^Ver\s+/i, "")
    .replace(/\s+Online.*$/i, "");
}

// ---- catálogo / búsqueda (HTML) ----

export function parseCards(html: string): Anime2Item[] {
  const out: Anime2Item[] = [];
  const seen = new Set<string>();
  const re =
    /<img[^>]+src="(https:\/\/cdn\.animeav1\.com\/covers\/[^"]+)"[^>]+alt="Portada de ([^"]+)"[\s\S]{0,1200}?href="\/media\/([a-z0-9-]+)"/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const [, cover, title, slug] = m;
    if (seen.has(slug)) continue;
    seen.add(slug);
    out.push({ slug, title: clean(title), cover });
  }
  return out;
}

export async function searchAnime2(query: string): Promise<Anime2Item[]> {
  const { html } = await fetchHtml(`/catalogo?search=${encodeURIComponent(query)}`);
  if (!html) return [];
  return parseCards(html);
}

export async function getAnime2Catalog(page = 1): Promise<Anime2Item[]> {
  const { html } = await fetchHtml(page > 1 ? `/catalogo?page=${page}` : "/catalogo");
  if (!html) return [];
  return parseCards(html);
}

export async function getAnime2Popular(): Promise<Anime2Item[]> {
  const { html } = await fetchHtml("/catalogo?order=popular");
  if (!html) return [];
  return parseCards(html);
}

export async function getAnime2ByGenre(genre: string): Promise<Anime2Item[]> {
  if (!/^[a-z-]{3,40}$/.test(genre)) return [];
  const { html } = await fetchHtml(`/catalogo?genre=${genre}`);
  if (!html) return [];
  return parseCards(html);
}

export interface Anime2RecentEpisode {
  slug: string;
  episode: number;
  title: string;
  cover: string | null;
  time: string | null;
}

// Episodios recién actualizados (home de AnimeAV1)
export async function getAnime2RecentEpisodes(): Promise<Anime2RecentEpisode[]> {
  const { html } = await fetchHtml("/");
  if (!html) return [];
  const out: Anime2RecentEpisode[] = [];
  const seen = new Set<string>();
  const articles = html.match(/<article[\s\S]*?<\/article>/gi) || [];
  for (const a of articles) {
    const link = a.match(/href="\/media\/([a-z0-9-]+)\/(\d+)"/i);
    if (!link) continue;
    const key = `${link[1]}/${link[2]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const cover = a.match(/src="(https:\/\/cdn\.animeav1\.com\/(?:covers|thumbnails)\/[^"]+)"/i)?.[1] || null;
    const title =
      clean(a.match(/<span class="sr-only">Ver ([\s\S]*?)<\/span>/i)?.[1] || "").replace(/\s+\d+$/, "") ||
      clean(a.match(/<div class="[^"]*text-subs[^"]*">([^<]+)<\/div>/i)?.[1] || "");
    const time = clean(a.match(/((?:hace|Hace)\s[^<]{1,25})/)?.[1] || "") || null;
    out.push({ slug: link[1], episode: parseInt(link[2], 10), title, cover, time });
    if (out.length >= 20) break;
  }
  return out;
}

// Animes recién agregados (home de AnimeAV1)
export async function getAnime2RecentAdded(): Promise<Anime2Item[]> {
  const { html } = await fetchHtml("/");
  if (!html) return [];
  return parseCards(html).slice(0, 20);
}

// ---- ficha (HTML) ----

const isValidSlug = (s: string) => /^[a-z0-9-]{2,120}$/.test(s);

export async function getAnime2Info(slug: string): Promise<Anime2Info | null> {
  if (!isValidSlug(slug)) return null;
  const { status, html } = await fetchHtml(`/media/${slug}`);
  if (status === 404 || !html) return null;

  const title =
    cleanTitle(html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] || "") ||
    cleanTitle(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "") ||
    slug;
  const cover = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] || null;
  const synopsis = clean(html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] || "");

  const genres = [...html.matchAll(/href="\/catalogo\?genre=([a-z-]+)"[^>]*>([^<]+)</gi)]
    .map((m) => clean(m[2]))
    .filter(Boolean)
    .slice(0, 8);

  const epNums = [...html.matchAll(new RegExp(`href="/media/${slug}/(\\d+)"`, "g"))]
    .map((m) => parseInt(m[1], 10))
    .filter((n) => Number.isInteger(n) && n > 0);
  const listed = [...new Set(epNums)].sort((a, b) => a - b);

  // El sitio pagina el listado a 50 con scroll infinito: si llega al tope,
  // descubrir el total real probando existencia (solo series largas pagan esto)
  let episodes = listed;
  if (listed.length >= 50) {
    const total = await expandEpisodeTotal(slug, listed[listed.length - 1]);
    episodes = Array.from({ length: total }, (_, i) => i + 1);
  }

  return {
    slug,
    title,
    cover,
    synopsis,
    genres,
    episodesCount: episodes.length ? episodes[episodes.length - 1] : 0,
    episodes,
  };
}

// La lista SSR trae 50 y el resto carga por scroll: el JSON del episodio
// incluye "embeds" solo si existe. Búsqueda exponencial + binaria (cap 2000).
const TOTAL_CACHE_TTL = 60 * 60 * 1000;
const totalCache = new Map<string, { at: number; total: number }>();

async function episodeExists(slug: string, n: number): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(
      `${AV1_BASE}/media/${slug}/${n}/__data.json?x-sveltekit-invalidated=011`,
      { headers: { "User-Agent": UA, "x-sveltekit-data": "true", Accept: "*/*" }, signal: controller.signal }
    );
    if (!res.ok) return false;
    const text = await res.text();
    return text.length > 1000 && text.includes("embeds");
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function expandEpisodeTotal(slug: string, knownMax: number): Promise<number> {
  const hit = totalCache.get(slug);
  if (hit && Date.now() - hit.at < TOTAL_CACHE_TTL) return hit.total;

  let total = knownMax;
  try {
    // fase exponencial en paralelo (upper=2001 como tope absoluto)
    let n = knownMax + 1;
    let upper = 2001;
    while (n <= 2000) {
      const batch = [n, n * 2, n * 4].filter((x) => x <= 2000);
      const res = await Promise.all(batch.map((x) => episodeExists(slug, x)));
      if (res[0]) {
        total = batch[0];
        if (res[1]) {
          total = batch[1];
          if (res[2]) {
            total = batch[2];
            n = batch[2] * 2;
            continue;
          }
          upper = batch[2];
          break;
        }
        upper = batch[1];
        break;
      }
      upper = batch[0];
      break;
    }
    // fase binaria entre total (existe) y upper (no existe o tope)
    if (upper > total + 1) {
      let lo = total;
      let hi = upper;
      while (hi - lo > 1) {
        const mid = Math.floor((lo + hi) / 2);
        if (await episodeExists(slug, mid)) lo = mid;
        else hi = mid;
      }
      total = lo;
    }
  } catch {
    total = knownMax;
  }

  totalCache.set(slug, { at: Date.now(), total });
  return total;
}

// ---- servidores (SvelteKit __data.json) ----

const LANG_MAP: Record<string, string> = { SUB: "subtitulado", DUB: "latino" };

interface DevaluedNode {
  nodes: { type: string; data?: unknown[] }[];
}

function resolveEmbeds(json: unknown): { lang: string; name: string; url: string }[] {
  const out: { lang: string; name: string; url: string }[] = [];
  try {
    const nodes = (json as DevaluedNode).nodes;
    const page = nodes.find((n) => n.type === "data" && Array.isArray(n.data) && typeof n.data[0] === "object" && n.data[0] !== null && "embeds" in (n.data[0] as object));
    if (!page?.data) return out;
    const arr = page.data as unknown[];
    const R = (i: unknown) => (typeof i === "number" ? arr[i] : i);
    const root = R((arr[0] as Record<string, unknown>).embeds);
    const embeds = R(root) as Record<string, unknown>;
    for (const [lang, ref] of Object.entries(embeds)) {
      const list = R(ref);
      if (!Array.isArray(list)) continue;
      for (const sref of list) {
        const s = R(sref) as Record<string, unknown>;
        const name = R(s.server);
        const url = R(s.url);
        if (typeof name === "string" && typeof url === "string" && /^https?:\/\//.test(url)) {
          out.push({ lang, name: name.trim() || "Server", url });
        }
      }
    }
  } catch {
    return out;
  }
  return out;
}

function fallbackIframes(html: string): { name: string; url: string }[] {
  const out: { name: string; url: string }[] = [];
  const seen = new Set<string>();
  const re = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (!url || !/^https?:\/\//i.test(url) || url.includes("about:blank")) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ name: `Servidor ${out.length + 1}`, url });
  }
  return out;
}

// Caché en memoria solo para éxitos
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; data: Anime2Server[] }>();

export async function getAnime2Servers(slug: string, episode: number): Promise<Anime2Server[]> {
  if (!isValidSlug(slug) || !Number.isInteger(episode) || episode < 1) return [];
  const key = `${slug}/${episode}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.data;

  const servers: Anime2Server[] = [];
  const seen = new Set<string>();

  // 1) JSON de SvelteKit: todos los servidores por idioma
  const { json } = await fetchJson(`/media/${slug}/${episode}/__data.json?x-sveltekit-invalidated=011`);
  if (json) {
    for (const s of resolveEmbeds(json)) {
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      servers.push({ name: s.name, url: s.url, lang: LANG_MAP[s.lang] || s.lang.toLowerCase() });
    }
  }

  // 2) Fallback: iframe del HTML (servidor por defecto)
  if (servers.length === 0) {
    const { html } = await fetchHtml(`/media/${slug}/${episode}`);
    for (const f of fallbackIframes(html)) {
      servers.push({ ...f, lang: "subtitulado" });
    }
  }

  if (servers.length > 0 && cache.size < CACHE_MAX) {
    cache.set(key, { at: Date.now(), data: servers });
  }
  return servers;
}
