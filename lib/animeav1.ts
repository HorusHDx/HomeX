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
  const episodes = [...new Set(epNums)].sort((a, b) => a - b);

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
