export interface ScrapedServer {
  name: string;
  url: string;
  lang: string;
}

const UNLIM_BASE = "https://unlimplay.com";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export const getMovieEmbedUrl = (tmdbId: number | string) =>
  `${UNLIM_BASE}/f/embed/movie/${tmdbId}`;

export const getTvEmbedUrl = (tmdbId: number | string, season: number, episode: number) =>
  `${UNLIM_BASE}/f/embed/tv/${tmdbId}/${season}/${episode}`;

// Prioridad de idioma: el primer servidor es el que el player auto-selecciona
const LANG_PRIORITY = ["latino", "castellano", "subtitulado", "original"];

function langRank(lang: string): number {
  const l = lang.toLowerCase().trim();
  const i = LANG_PRIORITY.indexOf(l);
  if (i >= 0) return i;
  if (l.includes("latino")) return 0;
  if (l.includes("castellano") || l.includes("espa")) return 1;
  if (l.includes("sub")) return 2;
  return 99;
}

// Caché en memoria (por instancia serverless): evita re-scrapear al
// navegar entre episodios o reintentar. Solo guarda éxitos reales.
const CACHE_TTL = 5 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; data: ScrapedServer[] }>();

function cacheGet(key: string): ScrapedServer[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function cacheSet(key: string, data: ScrapedServer[]): void {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), data });
}

function isDirectMedia(url: string): boolean {
  const variants = [url];
  try {
    variants.push(decodeURIComponent(url));
  } catch {}

  return variants.some(
    (u) =>
      /\.(m3u8|mp4|mkv|webm|m4v)(\?|#|&|%|\/|$)/i.test(u) ||
      /[?&](url|src|file|stream_url|playlist)=/i.test(u)
  );
}

// Iframes que nunca son video (captcha, analytics, ads)
const IFRAME_BLOCKLIST = ["google.", "gstatic.", "facebook.", "cloudflare", "hcaptcha.", "recaptcha"];

function isBlockedIframe(url: string): boolean {
  const l = url.toLowerCase();
  return IFRAME_BLOCKLIST.some((b) => l.includes(b));
}

function normKey(url: string): string {
  return url.trim().replace(/\/+$/, "").toLowerCase();
}

const NON_LANG_KEYS = new Set(["searched_names"]);

function extractServers(html: string, marker: string): ScrapedServer[] {
  // El JSON real va al final del HTML; buscar de atrás hacia adelante
  // evita parsear CSS/JS intermedio (más rápido y menos falsos positivos).
  const indices: number[] = [];
  for (let at = html.indexOf(marker); at >= 0; at = html.indexOf(marker, at + 1)) {
    indices.push(at);
  }
  for (let k = indices.length - 1; k >= 0; k--) {
    const open = html.indexOf("{", indices[k] + marker.length);
    if (open < 0) continue;

    const parsed = readBalancedObject(html, open);
    if (!parsed) continue;

    const servers = collect(parsed);
    if (servers.length > 0) return servers;
  }
  return [];
}

const MAX_OBJECT_SCAN = 60000;

function readBalancedObject(
  html: string,
  open: number
): Record<string, unknown> | null {
  let depth = 0;
  let inString = false;
  let escaped = false;
  const end = Math.min(html.length, open + MAX_OBJECT_SCAN);

  for (let i = open; i < end; i++) {
    const ch = html[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(html.slice(open, i + 1)) as unknown;
          return parsed && typeof parsed === "object"
            ? (parsed as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collect(data: Record<string, unknown>): ScrapedServer[] {
  const out: ScrapedServer[] = [];
  const seen = new Set<string>();

  for (const [lang, value] of Object.entries(data)) {
    if (NON_LANG_KEYS.has(lang)) continue;
    if (!value || typeof value !== "object") continue;

    for (const [name, rawUrl] of Object.entries(value as Record<string, unknown>)) {
      if (typeof rawUrl !== "string") continue;

      const url = rawUrl.trim();
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) continue;
      if (isDirectMedia(url)) continue;
      const key = normKey(url);
      if (seen.has(key)) continue;

      seen.add(key);
      out.push({ name: name.trim() || "Server", url, lang });
    }
  }

  // Latino primero: el player auto-selecciona servers[0]
  out.sort((a, b) => langRank(a.lang) - langRank(b.lang) || a.name.localeCompare(b.name));
  return out;
}

function extractIframes(html: string): ScrapedServer[] {
  const out: ScrapedServer[] = [];
  const seen = new Set<string>();
  const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/gi;
  let match;

  while ((match = iframeRegex.exec(html)) !== null) {
    const url = match[1];
    if (!url || url.includes("about:blank")) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    if (isDirectMedia(url)) continue;
    if (isBlockedIframe(url)) continue;
    const key = normKey(url);
    if (seen.has(key)) continue;

    seen.add(key);
    out.push({ name: `Embed ${out.length + 1}`, url, lang: "original" });
  }

  return out;
}

const FETCH_TIMEOUT = 6000;
const HTML_LIMIT = 2 * 1024 * 1024;

async function fetchHtml(embedUrl: string): Promise<{ status: number; html: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": UA,
        Referer: `${UNLIM_BASE}/`,
        "Accept-Language": "es-ES,es;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) return { status: res.status, html: "" };
    const html = await res.text();
    return { status: res.status, html: html.length > HTML_LIMIT ? "" : html };
  } finally {
    clearTimeout(timeout);
  }
}

function fallback(embedUrl: string): ScrapedServer[] {
  return [{ name: "Servidor Principal", url: embedUrl, lang: "original" }];
}

export async function scrapeServers(embedUrl: string): Promise<ScrapedServer[]> {
  const cached = cacheGet(embedUrl);
  if (cached) return cached;

  // 2 intentos solo ante fallos transitorios (timeout/red/5xx).
  // Un 404 es definitivo: el título no existe, sin reintento.
  for (let attempt = 0; attempt < 2; attempt++) {
    let status = 0;
    let html = "";
    try {
      ({ status, html } = await fetchHtml(embedUrl));
    } catch {
      if (attempt === 0) continue; // timeout o red: reintentar una vez
      return fallback(embedUrl);
    }

    if (status === 404) return [];
    if (!html) {
      if (status >= 500 && attempt === 0) continue;
      return status >= 500 ? fallback(embedUrl) : [];
    }

    const servers = extractServers(html, "finalizePlayer(");
    if (servers.length > 0) {
      cacheSet(embedUrl, servers);
      return servers;
    }

    const iframes = extractIframes(html);
    if (iframes.length > 0) {
      cacheSet(embedUrl, iframes);
      return iframes;
    }

    // 200 con HTML parseable pero sin datos: determinista, no reintentar
    return fallback(embedUrl);
  }
  return fallback(embedUrl);
}
