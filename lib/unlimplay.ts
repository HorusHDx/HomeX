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

const NON_LANG_KEYS = new Set(["searched_names"]);

function extractServers(html: string, marker: string): ScrapedServer[] {
  for (let at = html.indexOf(marker); at >= 0; at = html.indexOf(marker, at + 1)) {
    const open = html.indexOf("{", at + marker.length);
    if (open < 0) continue;

    const parsed = readBalancedObject(html, open);
    if (!parsed) continue;

    const servers = collect(parsed);
    if (servers.length > 0) return servers;
  }
  return [];
}

function readBalancedObject(
  html: string,
  open: number
): Record<string, unknown> | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = open; i < html.length; i++) {
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
      if (seen.has(url)) continue;

      seen.add(url);
      out.push({ name: name.trim() || "Server", url, lang });
    }
  }

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
    if (seen.has(url)) continue;

    seen.add(url);
    out.push({ name: `Embed ${out.length + 1}`, url, lang: "original" });
  }

  return out;
}

export async function scrapeServers(embedUrl: string): Promise<ScrapedServer[]> {
  try {
    const res = await fetch(embedUrl, {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "es-ES,es;q=0.9",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();

    const servers = extractServers(html, "finalizePlayer(");
    if (servers.length > 0) return servers;

    const iframes = extractIframes(html);
    if (iframes.length > 0) return iframes;

    return [];
  } catch {
    return [];
  }
}
